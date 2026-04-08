using System.Text.Json;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class MaterialIntakeService : IMaterialIntakeService
{
    private readonly IMaterialIntakeRepository _intakeRepository;
    private readonly IMaterialRepository _materialRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IIntakeExtractionQueue _intakeExtractionQueue;

    public MaterialIntakeService(
        IMaterialIntakeRepository intakeRepository,
        IMaterialRepository materialRepository,
        IUnitOfWork unitOfWork,
        IIntakeExtractionQueue intakeExtractionQueue)
    {
        _intakeRepository = intakeRepository;
        _materialRepository = materialRepository;
        _unitOfWork = unitOfWork;
        _intakeExtractionQueue = intakeExtractionQueue;
    }

    public async Task<MaterialIntakeResponse> CreateIntakeAsync(CreateIntakeRequest request, Guid uploadedByUserId)
    {
        var now = DateTime.UtcNow;

        var intake = new MaterialIntake
        {
            Id = Guid.NewGuid(),
            Status = IntakeStatus.Uploaded,
            PhotoBlobName = request.PhotoBlobName,
            PhotoUrl = request.PhotoUrl,
            SourceType = request.SourceType,
            UploadNotes = request.UploadNotes,
            UploadedByUserId = uploadedByUserId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        await _intakeRepository.AddAsync(intake);

        await _intakeRepository.AddEventAsync(new IntakeEvent
        {
            Id = Guid.NewGuid(),
            IntakeId = intake.Id,
            EventType = "intake.created",
            ToStatus = IntakeStatus.Uploaded,
            ActorUserId = uploadedByUserId,
            Details = JsonSerializer.Serialize(new
            {
                sourceType = request.SourceType.ToString(),
                hasUploadNotes = !string.IsNullOrWhiteSpace(request.UploadNotes)
            }),
            OccurredAtUtc = now,
        });

        await _unitOfWork.SaveChangesAsync();

        return MapToResponse(intake);
    }

    public async Task<MaterialIntakeResponse?> GetIntakeAsync(Guid intakeId)
    {
        var intake = await _intakeRepository.GetByIdAsync(intakeId);
        return intake is null ? null : MapToResponse(intake);
    }

    public async Task<PagedResponse<MaterialIntakeResponse>> GetIntakeQueueAsync(IntakeQueueFilter filter)
    {
        var pagedResult = await _intakeRepository.GetPagedAsync(filter);
        return PagedResponse<MaterialIntakeResponse>.FromPagedResult(pagedResult, MapToResponse);
    }

    public async Task<IReadOnlyList<IntakeEventResponse>> GetIntakeEventsAsync(Guid intakeId)
    {
        var intake = await _intakeRepository.GetWithEventsAsync(intakeId);
        if (intake is null)
        {
            return [];
        }

        return intake.Events
            .OrderBy(e => e.OccurredAtUtc)
            .Select(e => new IntakeEventResponse(
                e.Id,
                e.EventType,
                e.ToStatus,
                e.ActorUserId,
                e.Details,
                e.OccurredAtUtc))
            .ToList();
    }

    public async Task TriggerExtractionAsync(Guid intakeId, Guid requestedByUserId)
    {
        var intake = await _intakeRepository.GetByIdAsync(intakeId)
            ?? throw new NotFoundException("Material intake", intakeId);

        // Idempotent: if extraction is already in progress, don't re-enqueue.
        if (intake.Status == IntakeStatus.Extracting)
        {
            return;
        }

        IntakeStateMachine.EnsureTransition(intake.Status, IntakeStatus.Extracting);

        intake.Status = IntakeStatus.Extracting;
        intake.UpdatedAtUtc = DateTime.UtcNow;

        await _intakeRepository.AddEventAsync(new IntakeEvent
        {
            Id = Guid.NewGuid(),
            IntakeId = intake.Id,
            EventType = "extraction.queued",
            ToStatus = IntakeStatus.Extracting,
            ActorUserId = requestedByUserId,
            Details = JsonSerializer.Serialize(new
            {
                attempt = intake.ExtractionAttemptCount + 1,
                queuedAtUtc = DateTime.UtcNow
            }),
            OccurredAtUtc = DateTime.UtcNow,
        });

        await _unitOfWork.SaveChangesAsync();

        await _intakeExtractionQueue.EnqueueAsync(new IntakeExtractionQueueMessage(
            intake.Id,
            intake.PhotoBlobName,
            intake.ExtractionAttemptCount + 1,
            DateTime.UtcNow));
    }

    public async Task<ApproveIntakeResponse> ApproveIntakeAsync(Guid intakeId, ApproveIntakeRequest request, Guid actionedByUserId)
    {
        var intake = await _intakeRepository.GetByIdAsync(intakeId)
            ?? throw new NotFoundException("Material intake", intakeId);

        IntakeStateMachine.EnsureTransition(intake.Status, IntakeStatus.Approved);

        var now = DateTime.UtcNow;

        // Merge corrections on top of draft values
        var effectiveBrand        = request.CorrectedBrand ?? intake.DraftBrand;
        var effectiveColor        = request.CorrectedColor ?? intake.DraftColor;
        var effectiveTypeStr      = request.CorrectedMaterialType ?? intake.DraftMaterialType;
        var effectiveSpoolWeight  = request.CorrectedSpoolWeightGrams ?? intake.DraftSpoolWeightGrams;
        var effectivePrintSettings = request.CorrectedPrintSettingsHints ?? intake.DraftPrintSettingsHints;
        var effectiveBatchOrLot   = request.CorrectedBatchOrLot ?? intake.DraftBatchOrLot;

        if (string.IsNullOrWhiteSpace(effectiveColor))
            throw new BusinessRuleException("Material color is required for approval but was not extracted or provided.");

        if (!Enum.TryParse<MaterialType>(effectiveTypeStr, ignoreCase: true, out var effectiveType))
            throw new BusinessRuleException($"Invalid material type: '{effectiveTypeStr}'. Must be a recognised MaterialType.");

        // Auto-infer printing technology: Resin -> SLA, everything else -> FDM
        var technologies = await _materialRepository.GetAllTechnologiesAsync();
        var technologyName = effectiveType == MaterialType.Resin ? "SLA" : "FDM";
        var technology = technologies.FirstOrDefault(t =>
            t.Name.Equals(technologyName, StringComparison.OrdinalIgnoreCase));

        // Duplicate detection: same active Type + Color + Brand
        var duplicates = await _materialRepository.FindDuplicatesAsync(effectiveType, effectiveColor, effectiveBrand);

        Guid approvedMaterialId;
        IntakeApprovalOutcome outcome;

        if (duplicates.Count > 0)
        {
            var existing = duplicates[0];

            if (!request.AllowMerge)
            {
                // First attempt — return structured 409 so the caller can confirm
                throw new DuplicateMaterialException(
                    existing.Id,
                    existing.Brand,
                    existing.Color,
                    existing.Type.ToString(),
                    existing.StockGrams,
                    existing.PricePerGram);
            }

            // Confirmed merge: add spool weight to stock, overwrite price/g with latest price
            var newPricePerGram = effectiveSpoolWeight is > 0
                ? request.PricePerSpool / effectiveSpoolWeight.Value
                : existing.PricePerGram;

            existing.StockGrams    += effectiveSpoolWeight ?? 0m;
            existing.PricePerGram   = newPricePerGram;
            existing.PrintSettings  = effectivePrintSettings ?? existing.PrintSettings;
            existing.UpdatedAt      = now;
            _materialRepository.Update(existing);

            approvedMaterialId = existing.Id;
            outcome = IntakeApprovalOutcome.Updated;
        }
        else
        {
            // Create a new Material from the merged intake data
            var newMaterial = new Material
            {
                Id = Guid.NewGuid(),
                Type = effectiveType,
                Color = effectiveColor.Trim(),
                Brand = effectiveBrand,
PricePerGram = effectiveSpoolWeight is > 0
                    ? request.PricePerSpool / effectiveSpoolWeight.Value
                    : throw new BusinessRuleException("Cannot calculate price per gram: spool weight is unknown or zero. Provide a corrected spool weight before approving."),
                StockGrams = effectiveSpoolWeight ?? 0m,
                PrintSettings = effectivePrintSettings,
                Notes = effectiveBatchOrLot,
                PrintingTechnologyId = technology?.Id,
                IsActive = true,
                CreatedAt = now,
            };

            await _materialRepository.AddAsync(newMaterial);
            approvedMaterialId = newMaterial.Id;
            outcome = IntakeApprovalOutcome.Created;
        }

        // Stamp the intake record
        intake.Status           = IntakeStatus.Approved;
        intake.ApprovedMaterialId = approvedMaterialId;
        intake.ApprovalOutcome  = outcome;
        intake.ActionedByUserId = actionedByUserId;
        intake.ActionedAtUtc    = now;
        intake.UpdatedAtUtc     = now;
        intake.ReviewerCorrections = JsonSerializer.Serialize(request);

        await _intakeRepository.AddEventAsync(new IntakeEvent
        {
            Id           = Guid.NewGuid(),
            IntakeId     = intake.Id,
            EventType    = "intake.approved",
            ToStatus     = IntakeStatus.Approved,
            ActorUserId  = actionedByUserId,
            Details      = JsonSerializer.Serialize(new
            {
                outcome          = outcome.ToString(),
                approvedMaterialId,
pricePerSpool    = request.PricePerSpool,
                    pricePerGram     = effectiveSpoolWeight is > 0 ? request.PricePerSpool / effectiveSpoolWeight.Value : 0m,
            }),
            OccurredAtUtc = now,
        });

        await _unitOfWork.SaveChangesAsync();

        return new ApproveIntakeResponse(intake.Id, approvedMaterialId, outcome, actionedByUserId, now);
    }

    public async Task RejectIntakeAsync(Guid intakeId, RejectIntakeRequest request, Guid actionedByUserId)
    {
        var intake = await _intakeRepository.GetByIdAsync(intakeId)
            ?? throw new NotFoundException("Material intake", intakeId);

        IntakeStateMachine.EnsureTransition(intake.Status, IntakeStatus.Rejected);

        var now = DateTime.UtcNow;

        intake.Status           = IntakeStatus.Rejected;
        intake.RejectionReason  = request.Reason;
        intake.ActionedByUserId = actionedByUserId;
        intake.ActionedAtUtc    = now;
        intake.UpdatedAtUtc     = now;

        await _intakeRepository.AddEventAsync(new IntakeEvent
        {
            Id           = Guid.NewGuid(),
            IntakeId     = intake.Id,
            EventType    = "intake.rejected",
            ToStatus     = IntakeStatus.Rejected,
            ActorUserId  = actionedByUserId,
            Details      = JsonSerializer.Serialize(new { reason = request.Reason }),
            OccurredAtUtc = now,
        });

        await _unitOfWork.SaveChangesAsync();
    }

    private static MaterialIntakeResponse MapToResponse(MaterialIntake intake)
    {
        return new MaterialIntakeResponse(
            intake.Id,
            intake.Status,
            intake.SourceType,
            intake.PhotoUrl,
            intake.UploadNotes,
            intake.ExtractionAttemptCount,
            intake.LastExtractionError,
            intake.ExtractedAtUtc,
            intake.DraftBrand,
            intake.DraftMaterialType,
            intake.DraftColor,
            intake.DraftSpoolWeightGrams,
            intake.DraftPrintSettingsHints,
            intake.DraftBatchOrLot,
            intake.ConfidenceMap,
            intake.ApprovedMaterialId,
            intake.ApprovalOutcome,
            intake.RejectionReason,
            intake.UploadedByUserId,
            intake.ActionedByUserId,
            intake.CreatedAtUtc,
            intake.ActionedAtUtc);
    }
}
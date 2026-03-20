using System.Text.Json;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class MaterialIntakeService : IMaterialIntakeService
{
    private readonly IMaterialIntakeRepository _intakeRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MaterialIntakeService(
        IMaterialIntakeRepository intakeRepository,
        IUnitOfWork unitOfWork)
    {
        _intakeRepository = intakeRepository;
        _unitOfWork = unitOfWork;
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

    public Task<IReadOnlyList<MaterialIntakeResponse>> GetIntakeQueueAsync(IntakeQueueFilter filter)
    {
        throw new NotImplementedException("Queue filtering is implemented in issue #16.");
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

    public Task TriggerExtractionAsync(Guid intakeId, Guid requestedByUserId)
    {
        throw new NotImplementedException("Extraction queue trigger is implemented in issue #15.");
    }

    public Task<ApproveIntakeResponse> ApproveIntakeAsync(Guid intakeId, ApproveIntakeRequest request, Guid actionedByUserId)
    {
        throw new NotImplementedException("Approve workflow is implemented in issue #17.");
    }

    public Task RejectIntakeAsync(Guid intakeId, RejectIntakeRequest request, Guid actionedByUserId)
    {
        throw new NotImplementedException("Reject workflow is implemented in issue #17.");
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

using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services.Intake;

/// <summary>
/// The outcome of a single extraction processing attempt.
/// Used by the worker to decide whether to delete or re-enqueue the queue message.
/// </summary>
public enum ExtractionProcessingOutcome
{
    /// <summary>Extraction succeeded — intake transitioned to NeedsReview.</summary>
    Succeeded,
    /// <summary>Extraction failed but max retries not yet reached — re-enqueue.</summary>
    Retry,
    /// <summary>Extraction failed and max retries exhausted — dead-letter (delete message).</summary>
    DeadLettered,
    /// <summary>Intake not found or already in terminal state — discard message.</summary>
    Discarded,
}

/// <summary>
/// Handles the core extraction processing logic for a single intake.
/// Separated from <see cref="MaterialIntakeExtractionWorker"/> so that
/// retry/dead-letter behaviour can be tested independently of the queue transport.
/// </summary>
public class IntakeExtractionProcessor
{
    private readonly IMaterialIntakeRepository _intakeRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IExtractionProvider _provider;
    private readonly IFileStorageService _fileStorageService;
    private readonly MaterialIntakeQueueOptions _options;
    private readonly ILogger<IntakeExtractionProcessor> _logger;

    // Short TTL: the SAS URL only needs to live long enough for Azure Vision
    // to fetch the image during a single extraction call.
    private static readonly TimeSpan ExtractionSasTtl = TimeSpan.FromMinutes(15);

    public IntakeExtractionProcessor(
        IMaterialIntakeRepository intakeRepository,
        IUnitOfWork unitOfWork,
        IExtractionProvider provider,
        IFileStorageService fileStorageService,
        IOptions<MaterialIntakeQueueOptions> options,
        ILogger<IntakeExtractionProcessor> logger)
    {
        _intakeRepository   = intakeRepository;
        _unitOfWork         = unitOfWork;
        _provider           = provider;
        _fileStorageService = fileStorageService;
        _options            = options.Value;
        _logger             = logger;
    }

    /// <summary>
    /// Processes a single extraction job.
    /// Updates the intake entity and returns the outcome so the caller
    /// (worker) can manage queue message visibility.
    /// </summary>
    public async Task<ExtractionProcessingOutcome> ProcessAsync(
        Guid intakeId,
        CancellationToken cancellationToken = default)
    {
        var intake = await _intakeRepository.GetByIdAsync(intakeId);
        if (intake is null)
        {
            _logger.LogWarning(
                "Extraction message references missing intake {IntakeId}. Discarding.",
                intakeId);
            return ExtractionProcessingOutcome.Discarded;
        }

        // If the intake was already actioned while this message was queued, drop it.
        if (IntakeStateMachine.IsTerminal(intake.Status))
        {
            return ExtractionProcessingOutcome.Discarded;
        }

        try
        {
            intake.ExtractionAttemptCount += 1;

            // Generate a short-lived SAS URL so Azure AI Vision can fetch the blob.
            // The stored PhotoUrl is a private Azure Blob URL and is not publicly
            // accessible — passing it directly to the Vision API returns 409.
            var photoUrl = !string.IsNullOrEmpty(intake.PhotoBlobName)
                ? await _fileStorageService.GenerateSasUrlAsync(intake.PhotoBlobName, ExtractionSasTtl)
                : intake.PhotoUrl;

            var result = await _provider.ExtractAsync(
                new ExtractionRequest(intake.Id, photoUrl), cancellationToken);

            intake.UpdatedAtUtc = DateTime.UtcNow;

            if (!result.Success)
                throw new InvalidOperationException(
                    result.ErrorMessage ?? "Extraction provider returned failure.");

            intake.DraftBrand                = result.Brand;
            intake.DraftMaterialType         = result.MaterialType;
            intake.DraftColor                = result.Color;
            intake.DraftSpoolWeightGrams     = result.SpoolWeightGrams;
            intake.DraftPrintSettingsHints   = result.PrintSettingsHints;
            intake.DraftBatchOrLot           = result.BatchOrLot;
            intake.ConfidenceMap             = JsonSerializer.Serialize(
                new Dictionary<string, object?>
                {
                    ["brand"]         = result.Confidence.Brand,
                    ["type"]          = result.Confidence.MaterialType,
                    ["color"]         = result.Confidence.Color,
                    ["spoolWeight"]   = result.Confidence.SpoolWeightGrams,
                    ["printSettings"] = result.Confidence.PrintSettingsHints,
                    ["batchOrLot"]    = result.Confidence.BatchOrLot,
                },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            intake.LastExtractionError = null;
            intake.ExtractedAtUtc      = DateTime.UtcNow;

            IntakeStateMachine.EnsureTransition(intake.Status, IntakeStatus.NeedsReview);
            intake.Status = IntakeStatus.NeedsReview;

            await _intakeRepository.AddEventAsync(new IntakeEvent
            {
                Id            = Guid.NewGuid(),
                IntakeId      = intake.Id,
                EventType     = "extraction.completed",
                ToStatus      = IntakeStatus.NeedsReview,
                ActorUserId   = intake.UploadedByUserId,
                Details       = JsonSerializer.Serialize(new
                {
                    attempt  = intake.ExtractionAttemptCount,
                    provider = _provider.GetType().Name
                }),
                OccurredAtUtc = DateTime.UtcNow,
            });

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "intake.extraction.completed IntakeId={IntakeId} Attempt={Attempt} Provider={Provider}",
                intake.Id, intake.ExtractionAttemptCount, _provider.GetType().Name);

            return ExtractionProcessingOutcome.Succeeded;
        }
        catch (Exception ex)
        {
            intake.LastExtractionError = ex.Message;
            intake.UpdatedAtUtc        = DateTime.UtcNow;

            if (intake.ExtractionAttemptCount >= _options.MaxRetries)
            {
                intake.Status         = IntakeStatus.Failed;
                intake.ExtractedAtUtc = DateTime.UtcNow;

                await _intakeRepository.AddEventAsync(new IntakeEvent
                {
                    Id            = Guid.NewGuid(),
                    IntakeId      = intake.Id,
                    EventType     = "extraction.failed",
                    ToStatus      = IntakeStatus.Failed,
                    ActorUserId   = intake.UploadedByUserId,
                    Details       = JsonSerializer.Serialize(new
                    {
                        attempt    = intake.ExtractionAttemptCount,
                        error      = ex.Message,
                        maxRetries = _options.MaxRetries
                    }),
                    OccurredAtUtc = DateTime.UtcNow,
                });

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                _logger.LogWarning(ex,
                    "Extraction failed permanently for intake {IntakeId} after {Attempts} attempts.",
                    intake.Id, intake.ExtractionAttemptCount);

                _logger.LogInformation(
                    "intake.extraction.dead_lettered IntakeId={IntakeId} Attempts={Attempts}",
                    intake.Id, intake.ExtractionAttemptCount);

                return ExtractionProcessingOutcome.DeadLettered;
            }
            else
            {
                await _intakeRepository.AddEventAsync(new IntakeEvent
                {
                    Id            = Guid.NewGuid(),
                    IntakeId      = intake.Id,
                    EventType     = "extraction.retrying",
                    ToStatus      = intake.Status,
                    ActorUserId   = intake.UploadedByUserId,
                    Details       = JsonSerializer.Serialize(new
                    {
                        attempt    = intake.ExtractionAttemptCount,
                        error      = ex.Message,
                        maxRetries = _options.MaxRetries
                    }),
                    OccurredAtUtc = DateTime.UtcNow,
                });

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                _logger.LogWarning(ex,
                    "Extraction failed for intake {IntakeId}. Retrying (attempt {Attempt}/{MaxRetries}).",
                    intake.Id, intake.ExtractionAttemptCount, _options.MaxRetries);

                return ExtractionProcessingOutcome.Retry;
            }
        }
    }
}
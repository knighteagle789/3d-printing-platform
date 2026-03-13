using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Intake
{
    // ── Request DTOs ─────────────────────────────────────────────────────────

    public record CreateIntakeRequest(
        /// <summary>Blob name of the already-uploaded and normalized photo.</summary>
        string PhotoBlobName,
        string PhotoUrl,
        IntakeSourceType SourceType,
        string? UploadNotes
    );

    public record ApproveIntakeRequest(
        /// <summary>
        /// Corrections to draft field values made during review.
        /// Only include fields that were changed — null means accept extracted value.
        /// </summary>
        string? CorrectedBrand,
        string? CorrectedMaterialType,
        string? CorrectedColor,
        decimal? CorrectedSpoolWeightGrams,
        string? CorrectedPrintSettingsHints,
        string? CorrectedBatchOrLot
    );

    public record RejectIntakeRequest(
        string Reason
    );

    public record IntakeQueueFilter(
        IntakeStatus? Status = null,
        Guid? UploadedByUserId = null,
        DateTime? CreatedAfterUtc = null,
        DateTime? CreatedBeforeUtc = null,
        string? SearchText = null,
        int Page = 1,
        int PageSize = 25
    );

    // ── Response DTOs ────────────────────────────────────────────────────────

    public record MaterialIntakeResponse(
        Guid Id,
        IntakeStatus Status,
        IntakeSourceType SourceType,
        string PhotoUrl,
        string? UploadNotes,

        // Extraction results
        int ExtractionAttemptCount,
        string? LastExtractionError,
        DateTime? ExtractedAtUtc,

        // Draft fields (null if not yet extracted)
        string? DraftBrand,
        string? DraftMaterialType,
        string? DraftColor,
        decimal? DraftSpoolWeightGrams,
        string? DraftPrintSettingsHints,
        string? DraftBatchOrLot,

        // Confidence (null if not yet extracted)
        string? ConfidenceMap,

        // Outcome (null until approved)
        Guid? ApprovedMaterialId,
        IntakeApprovalOutcome? ApprovalOutcome,
        string? RejectionReason,

        // Audit
        Guid UploadedByUserId,
        Guid? ActionedByUserId,
        DateTime CreatedAtUtc,
        DateTime? ActionedAtUtc
    );

    public record ApproveIntakeResponse(
        Guid IntakeId,
        Guid MaterialId,
        IntakeApprovalOutcome Outcome,
        Guid ActionedByUserId,
        DateTime ActionedAtUtc
    );

    public record IntakeEventResponse(
        Guid Id,
        string EventType,
        IntakeStatus ToStatus,
        Guid ActorUserId,
        string? Details,
        DateTime OccurredAtUtc
    );
}

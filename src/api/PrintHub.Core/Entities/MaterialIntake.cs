using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a single photo-to-material intake session.
    /// Tracks the full lifecycle from photo upload through AI extraction to human review and final approval.
    /// </summary>
    public class MaterialIntake
    {
        public Guid Id { get; set; }

        /// <summary>Current lifecycle status of this intake record.</summary>
        public IntakeStatus Status { get; set; } = IntakeStatus.Uploaded;

        /// <summary>Blob storage reference for the normalized photo (always JPEG after upload processing).</summary>
        public string PhotoBlobName { get; set; } = string.Empty;

        /// <summary>Full URL to the normalized photo in blob storage.</summary>
        public string PhotoUrl { get; set; } = string.Empty;

        /// <summary>How the photo was submitted (Mobile, Webcam, FileUpload).</summary>
        public IntakeSourceType SourceType { get; set; } = IntakeSourceType.FileUpload;

        /// <summary>Optional notes added at upload time by the submitting staff member.</summary>
        public string? UploadNotes { get; set; }

        // ── Extraction metadata ──────────────────────────────────────────────

        /// <summary>Number of extraction attempts made so far.</summary>
        public int ExtractionAttemptCount { get; set; }

        /// <summary>Error details from the most recent failed extraction attempt.</summary>
        public string? LastExtractionError { get; set; }

        /// <summary>UTC timestamp when extraction completed (success or terminal failure).</summary>
        public DateTime? ExtractedAtUtc { get; set; }

        // ── Extracted draft fields ───────────────────────────────────────────

        public string? DraftBrand { get; set; }
        public string? DraftMaterialType { get; set; }
        public string? DraftColor { get; set; }
        public decimal? DraftSpoolWeightGrams { get; set; }

        /// <summary>Extracted print settings hints as JSON (bedTemp, nozzleTemp, speed).</summary>
        public string? DraftPrintSettingsHints { get; set; }

        public string? DraftBatchOrLot { get; set; }

        /// <summary>
        /// Per-field confidence scores and source text snippets as JSON.
        /// Schema: { fieldName: { score: 0.0-1.0, sourceText: "..." } }
        /// </summary>
        public string? ConfidenceMap { get; set; }

        // ── Review corrections ───────────────────────────────────────────────

        /// <summary>
        /// Corrections made by the reviewer prior to approval, stored as JSON.
        /// Schema mirrors the Draft fields — only corrected fields need to be present.
        /// </summary>
        public string? ReviewerCorrections { get; set; }

        // ── Outcome ─────────────────────────────────────────────────────────

        /// <summary>The Material record created or updated when this intake was approved.</summary>
        public Guid? ApprovedMaterialId { get; set; }

        /// <summary>Result of the approval write-through: Created, Updated, or NeedsMergeReview.</summary>
        public IntakeApprovalOutcome? ApprovalOutcome { get; set; }

        /// <summary>Reason provided when rejecting this intake.</summary>
        public string? RejectionReason { get; set; }

        // ── Audit ────────────────────────────────────────────────────────────

        public Guid UploadedByUserId { get; set; }

        public Guid? ActionedByUserId { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public DateTime? ActionedAtUtc { get; set; }

        public DateTime? UpdatedAtUtc { get; set; }

        // ── Navigation ───────────────────────────────────────────────────────

        public virtual User UploadedBy { get; set; } = null!;
        public virtual User? ActionedBy { get; set; }
        public virtual Material? ApprovedMaterial { get; set; }
        public virtual ICollection<IntakeEvent> Events { get; set; } = new List<IntakeEvent>();
    }

    /// <summary>Immutable audit event for a lifecycle transition on a MaterialIntake record.</summary>
    public class IntakeEvent
    {
        public Guid Id { get; set; }

        public Guid IntakeId { get; set; }

        public string EventType { get; set; } = string.Empty;

        /// <summary>Status the intake transitioned TO with this event.</summary>
        public IntakeStatus ToStatus { get; set; }

        public Guid ActorUserId { get; set; }

        /// <summary>Optional metadata about this event (e.g. rejection reason, error message) as JSON.</summary>
        public string? Details { get; set; }

        public DateTime OccurredAtUtc { get; set; }

        public virtual MaterialIntake Intake { get; set; } = null!;
    }

    // ── Enums ────────────────────────────────────────────────────────────────

    public enum IntakeStatus
    {
        /// <summary>Photo has been uploaded and normalized. Extraction not yet started.</summary>
        Uploaded = 0,

        /// <summary>Message has been queued; worker is actively extracting fields.</summary>
        Extracting = 1,

        /// <summary>Extraction completed. Awaiting human review before approval.</summary>
        NeedsReview = 2,

        /// <summary>Terminal: intake approved and material record created/updated.</summary>
        Approved = 3,

        /// <summary>Terminal: intake explicitly rejected by a reviewer.</summary>
        Rejected = 4,

        /// <summary>Terminal: extraction failed after maximum retry attempts.</summary>
        Failed = 5,
    }

    public enum IntakeSourceType
    {
        Mobile = 0,
        Webcam = 1,
        FileUpload = 2,
    }

    public enum IntakeApprovalOutcome
    {
        /// <summary>A new Material record was created from this intake.</summary>
        Created = 0,

        /// <summary>An existing Material record was updated with data from this intake.</summary>
        Updated = 1,

        /// <summary>A potential duplicate was detected; manual merge review required.</summary>
        NeedsMergeReview = 2,
    }
}

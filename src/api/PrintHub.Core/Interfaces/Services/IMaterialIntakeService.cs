using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces.Services
{
    /// <summary>
    /// Service interface for the material intake lifecycle.
    /// Covers upload, extraction status, review, approve, reject, and audit.
    /// </summary>
    public interface IMaterialIntakeService
    {
        // ── Upload ───────────────────────────────────────────────────────────

        Task<MaterialIntakeResponse> CreateIntakeAsync(CreateIntakeRequest request, Guid uploadedByUserId);

        // ── Read ─────────────────────────────────────────────────────────────

        Task<MaterialIntakeResponse?> GetIntakeAsync(Guid intakeId);

        Task<PagedResponse<MaterialIntakeResponse>> GetIntakeQueueAsync(IntakeQueueFilter filter);

        Task<IReadOnlyList<IntakeEventResponse>> GetIntakeEventsAsync(Guid intakeId);

        // ── Extraction ───────────────────────────────────────────────────────

        /// <summary>
        /// Enqueues an extraction job for the given intake.
        /// Called automatically after upload, and manually for re-extract from Failed state.
        /// </summary>
        Task TriggerExtractionAsync(Guid intakeId, Guid requestedByUserId);

        // ── Review actions ───────────────────────────────────────────────────

        Task<ApproveIntakeResponse> ApproveIntakeAsync(Guid intakeId, ApproveIntakeRequest request, Guid actionedByUserId);

        Task RejectIntakeAsync(Guid intakeId, RejectIntakeRequest request, Guid actionedByUserId);
    }
}

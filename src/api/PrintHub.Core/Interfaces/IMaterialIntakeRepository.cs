using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces
{
    /// <summary>
    /// Repository interface for MaterialIntake records and their lifecycle queries.
    /// </summary>
    public interface IMaterialIntakeRepository : IRepository<MaterialIntake>
    {
        Task<MaterialIntake?> GetWithEventsAsync(Guid intakeId);

        Task<IReadOnlyList<MaterialIntake>> GetByStatusAsync(IntakeStatus status);

        Task<IReadOnlyList<MaterialIntake>> GetByUploaderAsync(Guid userId);

        /// <summary>
        /// Returns Rejected intake records whose CreatedAtUtc is older than the given cutoff.
        /// Used by the data retention cleanup job.
        /// </summary>
        Task<IReadOnlyList<MaterialIntake>> GetRejectedOlderThanAsync(DateTime cutoffUtc);

        Task AddEventAsync(IntakeEvent intakeEvent);

        /// <summary>
        /// Returns a filtered, paginated page of intake records ordered by CreatedAtUtc descending.
        /// </summary>
        Task<PagedResult<MaterialIntake>> GetPagedAsync(IntakeQueueFilter filter);
    }
}

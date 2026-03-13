using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories
{
    public class MaterialIntakeRepository : Repository<MaterialIntake>, IMaterialIntakeRepository
    {
        public MaterialIntakeRepository(ApplicationDbContext context) : base(context) { }

        public async Task<MaterialIntake?> GetWithEventsAsync(Guid intakeId)
        {
            return await _context.MaterialIntakes
                .Include(i => i.Events.OrderBy(e => e.OccurredAtUtc))
                .Include(i => i.UploadedBy)
                .Include(i => i.ActionedBy)
                .FirstOrDefaultAsync(i => i.Id == intakeId);
        }

        public async Task<IReadOnlyList<MaterialIntake>> GetByStatusAsync(IntakeStatus status)
        {
            return await _context.MaterialIntakes
                .Where(i => i.Status == status)
                .OrderByDescending(i => i.CreatedAtUtc)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<MaterialIntake>> GetByUploaderAsync(Guid userId)
        {
            return await _context.MaterialIntakes
                .Where(i => i.UploadedByUserId == userId)
                .OrderByDescending(i => i.CreatedAtUtc)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<MaterialIntake>> GetRejectedOlderThanAsync(DateTime cutoffUtc)
        {
            return await _context.MaterialIntakes
                .Where(i => i.Status == IntakeStatus.Rejected && i.CreatedAtUtc < cutoffUtc)
                .ToListAsync();
        }

        public async Task AddEventAsync(IntakeEvent intakeEvent)
        {
            await _context.IntakeEvents.AddAsync(intakeEvent);
        }
    }
}

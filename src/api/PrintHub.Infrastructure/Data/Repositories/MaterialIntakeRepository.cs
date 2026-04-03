using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Intake;
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

        public async Task<PagedResult<MaterialIntake>> GetPagedAsync(IntakeQueueFilter filter)
        {
            var query = _context.MaterialIntakes.AsQueryable();

            if (filter.Status.HasValue)
                query = query.Where(i => i.Status == filter.Status.Value);

            if (filter.UploadedByUserId.HasValue)
                query = query.Where(i => i.UploadedByUserId == filter.UploadedByUserId.Value);

            if (filter.CreatedAfterUtc.HasValue)
                query = query.Where(i => i.CreatedAtUtc >= filter.CreatedAfterUtc.Value);

            if (filter.CreatedBeforeUtc.HasValue)
                query = query.Where(i => i.CreatedAtUtc <= filter.CreatedBeforeUtc.Value);

            if (!string.IsNullOrWhiteSpace(filter.SearchText))
            {
                var search = filter.SearchText.ToLower();
                query = query.Where(i =>
                    (i.DraftBrand != null && i.DraftBrand.ToLower().Contains(search)) ||
                    (i.DraftMaterialType != null && i.DraftMaterialType.ToLower().Contains(search)) ||
                    (i.DraftColor != null && i.DraftColor.ToLower().Contains(search)) ||
                    (i.UploadNotes != null && i.UploadNotes.ToLower().Contains(search)));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(i => i.CreatedAtUtc)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<MaterialIntake>(items, totalCount, filter.Page, filter.PageSize);
        }
    }
}

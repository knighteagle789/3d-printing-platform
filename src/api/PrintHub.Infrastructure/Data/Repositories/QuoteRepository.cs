using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class QuoteRepository : Repository<QuoteRequest>, IQuoteRepository
{
    public QuoteRepository(ApplicationDbContext context) : base(context) { }

    public async Task<PagedResult<QuoteRequest>> GetAllQuotesAsync(
        Guid? userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = userId.HasValue
            ? _dbSet.Where(q => q.UserId == userId.Value)
            : _dbSet.AsQueryable();

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(q => q.User)
            .Include(q => q.Responses)
            .OrderByDescending(q => q.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<QuoteRequest>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<QuoteRequest>> GetUserQuotesAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(q => q.UserId == userId);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(q => q.Responses)
            .OrderByDescending(q => q.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<QuoteRequest>(items, totalCount, page, pageSize);
    }

    public async Task<QuoteRequest?> GetQuoteWithResponsesAsync(Guid quoteRequestId)
    {
        return await _dbSet
            .Include(q => q.User)
            .Include(q => q.File)
            .Include(q => q.PreferredMaterial)
            .Include(q => q.Responses)
                .ThenInclude(r => r.CreatedBy)
            .Include(q => q.Responses)
                .ThenInclude(r => r.RecommendedMaterial)
            .FirstOrDefaultAsync(q => q.Id == quoteRequestId);
    }

    public async Task<PagedResult<QuoteRequest>> GetPendingQuotesAsync(
        int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(q => q.Status == QuoteStatus.Pending);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(q => q.User)
            .OrderBy(q => q.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<QuoteRequest>(items, totalCount, page, pageSize);
    }

    public async Task<IReadOnlyList<QuoteRequest>> GetExpiringQuotesAsync(int withinDays = 7)
    {
        var cutoff = DateTime.UtcNow.AddDays(withinDays);

        return await _dbSet
            .Include(q => q.User)
            .Include(q => q.Responses)
            .Where(q => q.Status == QuoteStatus.QuoteProvided &&
                        q.Responses.Any(r =>
                            r.ExpiresAt <= cutoff &&
                            r.ExpiresAt > DateTime.UtcNow))
            .OrderBy(q => q.Responses.Min(r => r.ExpiresAt))
            .ToListAsync();
    }

    public async Task AddQuoteResponseAsync(QuoteResponse response)
    {
        await _context.QuoteResponses.AddAsync(response);
    }
}
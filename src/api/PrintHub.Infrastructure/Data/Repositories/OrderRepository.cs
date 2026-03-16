using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(ApplicationDbContext context) : base(context) { }

    public async Task<PagedResult<Order>> GetAllOrdersAsync(
        Guid? userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = userId.HasValue
            ? _dbSet.Where(o => o.UserId == userId.Value)
            : _dbSet.AsQueryable();

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(o => o.User)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Order>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<Order>> GetUserOrdersAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(o => o.UserId == userId);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Order>(items, totalCount, page, pageSize);
    }

    public async Task<Order?> GetOrderWithDetailsAsync(Guid orderId)
    {
        return await _dbSet
            .Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Material)
            .Include(o => o.Items)
                .ThenInclude(i => i.File)
            .Include(o => o.StatusHistory.OrderBy(sh => sh.ChangedAt))
                .ThenInclude(sh => sh.ChangedBy)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<PagedResult<Order>> GetOrdersByStatusAsync(
        OrderStatus status, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(o => o.Status == status);

        var totalCount = await query.CountAsync();
        var items = await query
            .Include(o => o.User)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Order>(items, totalCount, page, pageSize);
    }

    public async Task<IReadOnlyList<Order>> GetRecentOrdersAsync(int count = 10)
    {
        return await _dbSet
            .Include(o => o.User)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync()
    {
        return await _dbSet
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count);
    }

    public async Task AddStatusHistoryAsync(OrderStatusHistory statusHistory)
    {
        await _context.OrderStatusHistory.AddAsync(statusHistory);
    }

    public async Task<IReadOnlyList<OrderStatusHistory>> GetStatusHistoryAsync(Guid orderId)
    {
        return await _context.OrderStatusHistory
            .Where(sh => sh.OrderId == orderId)
            .Include(sh => sh.ChangedBy)
            .OrderBy(sh => sh.ChangedAt)
            .ToListAsync();
    }
}
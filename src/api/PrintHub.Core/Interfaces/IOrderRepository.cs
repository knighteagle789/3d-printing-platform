using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for Order, OrderItem, and OrderStatusHistory entities.
/// The order domain is the most complex — orders touch users, materials,
/// files, and have their own status workflow.
/// </summary>
public interface IOrderRepository : IRepository<Order>
{
    /// <summary>All orders, optionally scoped to a user. Used by admin list with ?userId= filter.</summary>
    Task<PagedResult<Order>> GetAllOrdersAsync(Guid? userId, int page = 1, int pageSize = 20);

    Task<PagedResult<Order>> GetUserOrdersAsync(Guid userId, int page = 1, int pageSize = 20);

    Task<Order?> GetOrderWithDetailsAsync(Guid orderId);

    Task<PagedResult<Order>> GetOrdersByStatusAsync(OrderStatus status, int page = 1, int pageSize = 20);

    Task<IReadOnlyList<Order>> GetRecentOrdersAsync(int count = 10);

    /// <summary>Single GROUP BY query returning count per status. Backs GET /Orders/status-counts.</summary>
    Task<Dictionary<string, int>> GetStatusCountsAsync();

    Task AddStatusHistoryAsync(OrderStatusHistory statusHistory);

    Task<IReadOnlyList<OrderStatusHistory>> GetStatusHistoryAsync(Guid orderId);

    /// <summary>
    /// Returns total revenue split by order origin (quote-originated vs direct)
    /// for orders created within <paramref name="days"/> days.
    /// Excludes cancelled orders from revenue totals.
    /// </summary>
    Task<OrderRevenueBySource> GetRevenueBySourceAsync(int days);
}

/// <summary>
/// Revenue totals split by whether the order came from a quote flow or was placed directly.
/// </summary>
public record OrderRevenueBySource(
    decimal QuoteOriginated,
    decimal Direct);
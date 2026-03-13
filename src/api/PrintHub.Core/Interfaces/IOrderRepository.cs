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

    Task AddStatusHistoryAsync(OrderStatusHistory statusHistory);

    Task<IReadOnlyList<OrderStatusHistory>> GetStatusHistoryAsync(Guid orderId);
}
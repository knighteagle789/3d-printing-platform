using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for order management.
/// Handles the complete order lifecycle from creation through fulfillment.
/// </summary>
public interface IOrderService
{
    // --- Customer operations ---
    Task<OrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request);
    Task<OrderResponse> GetOrderByIdAsync(Guid orderId);
    Task<PagedResponse<OrderResponse>> GetUserOrdersAsync(
        Guid userId, int page = 1, int pageSize = 20);

    // --- Admin operations ---

    /// <summary>All orders, optionally filtered to a specific user. GET /Orders?userId=</summary>
    Task<PagedResponse<OrderResponse>> GetAllOrdersAsync(
        Guid? userId, int page = 1, int pageSize = 20);

    Task<PagedResponse<OrderResponse>> GetOrdersByStatusAsync(
        string status, int page = 1, int pageSize = 20);
    Task<IReadOnlyList<OrderResponse>> GetRecentOrdersAsync(int count = 10);
    Task<OrderResponse> UpdateOrderStatusAsync(
        Guid orderId, string newStatus, Guid changedByUserId, string? notes = null);

    /// <summary>Count per status in a single query. Backs GET /Orders/status-counts.</summary>
    Task<Dictionary<string, int>> GetStatusCountsAsync();

    // --- Order history ---
    Task<IReadOnlyList<OrderStatusHistoryResponse>> GetOrderHistoryAsync(Guid orderId);
}
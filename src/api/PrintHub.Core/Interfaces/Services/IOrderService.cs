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
    Task<PagedResponse<OrderResponse>> GetOrdersByStatusAsync(
        string status, int page = 1, int pageSize = 20);
    Task<IReadOnlyList<OrderResponse>> GetRecentOrdersAsync(int count = 10);
    Task<OrderResponse> UpdateOrderStatusAsync(
        Guid orderId, string newStatus, Guid changedByUserId, string? notes = null);

    // --- Order history ---
    Task<IReadOnlyList<OrderStatusHistoryResponse>> GetOrderHistoryAsync(Guid orderId);
}
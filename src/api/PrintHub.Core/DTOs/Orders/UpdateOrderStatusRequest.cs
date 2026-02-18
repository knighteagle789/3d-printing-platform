namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Request to change an order's status.
/// </summary>
public record UpdateOrderStatusRequest(
    string Status,
    string? Notes);
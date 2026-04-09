namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Data required to update a Draft order.
/// Replaces all items wholesale — pricing is recalculated from the
/// submitted item list, consistent with how CreateOrderAsync works.
/// Only permitted while the order is in Draft status.
/// </summary>
public record UpdateOrderRequest(
    string? Notes,
    string? ShippingAddress,
    DateTime? RequiredByDate,
    List<CreateOrderItemRequest> Items);
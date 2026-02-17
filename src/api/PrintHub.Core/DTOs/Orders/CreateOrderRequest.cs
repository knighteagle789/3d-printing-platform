namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Data required to create a new order.
/// The service layer handles pricing calculation and validation.
/// </summary>
public record CreateOrderRequest(
    string? Notes,
    string? ShippingAddress,
    DateTime? RequiredByDate,
    List<CreateOrderItemRequest> Items);

/// <summary>
/// Individual item within a new order.
/// </summary>
public record CreateOrderItemRequest(
    Guid FileId,
    Guid MaterialId,
    int Quantity,
    string? Color,
    string? SpecialInstructions,
    string Quality,
    decimal? Infill,
    bool SupportStructures);
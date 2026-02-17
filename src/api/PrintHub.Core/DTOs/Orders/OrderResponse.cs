using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Order data returned by the API.
/// Includes nested items and optional user info.
/// </summary>
public record OrderResponse(
    Guid Id,
    string OrderNumber,
    string Status,
    decimal TotalPrice,
    decimal? ShippingCost,
    decimal? Tax,
    string? Notes,
    string? ShippingAddress,
    DateTime? RequiredByDate,
    DateTime? ShippedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    IReadOnlyList<OrderItemResponse> Items,
    UserSummaryResponse? User)
{
    public static OrderResponse FromEntity(Order order) => new(
        Id: order.Id,
        OrderNumber: order.OrderNumber,
        Status: order.Status.ToString(),
        TotalPrice: order.TotalPrice,
        ShippingCost: order.ShippingCost,
        Tax: order.Tax,
        Notes: order.Notes,
        ShippingAddress: order.ShippingAddress,
        RequiredByDate: order.RequiredByDate,
        ShippedAt: order.ShippedAt,
        CompletedAt: order.CompletedAt,
        CreatedAt: order.CreatedAt,
        Items: order.Items?.Select(OrderItemResponse.FromEntity).ToList()
            ?? new List<OrderItemResponse>(),
        User: order.User != null
            ? UserSummaryResponse.FromEntity(order.User)
            : null
    );
}

/// <summary>
/// Minimal user info embedded in other responses.
/// Used when you need to show who placed an order or who changed a status,
/// but don't need their full profile.
/// </summary>
public record UserSummaryResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName)
{
    public static UserSummaryResponse FromEntity(User user) => new(
        Id: user.Id,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName
    );
}
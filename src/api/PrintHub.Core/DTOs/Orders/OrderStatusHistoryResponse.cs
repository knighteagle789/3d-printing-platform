using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Status change entry for the order timeline.
/// </summary>
public record OrderStatusHistoryResponse(
    Guid Id,
    string Status,
    string? Notes,
    DateTime ChangedAt,
    UserSummaryResponse? ChangedBy)
{
    public static OrderStatusHistoryResponse FromEntity(OrderStatusHistory history) => new(
        Id: history.Id,
        Status: history.Status.ToString(),
        Notes: history.Notes,
        ChangedAt: history.ChangedAt,
        ChangedBy: history.ChangedBy != null
            ? UserSummaryResponse.FromEntity(history.ChangedBy)
            : null
    );
}
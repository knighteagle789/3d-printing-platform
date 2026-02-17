using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Quote response (the admin's pricing proposal) returned by the API.
/// Named "Dto" suffix to avoid collision with the QuoteResponse entity.
/// </summary>
public record QuoteResponseDto(
    Guid Id,
    decimal Price,
    decimal? ShippingCost,
    int EstimatedDays,
    string? RecommendedColor,
    string? TechnicalNotes,
    string? AlternativeOptions,
    DateTime ExpiresAt,
    bool IsAccepted,
    DateTime? AcceptedAt,
    DateTime CreatedAt,
    MaterialSummaryResponse? RecommendedMaterial,
    UserSummaryResponse? CreatedBy)
{
    public static QuoteResponseDto FromEntity(QuoteResponse response) => new(
        Id: response.Id,
        Price: response.Price,
        ShippingCost: response.ShippingCost,
        EstimatedDays: response.EstimatedDays,
        RecommendedColor: response.RecommendedColor,
        TechnicalNotes: response.TechnicalNotes,
        AlternativeOptions: response.AlternativeOptions,
        ExpiresAt: response.ExpiresAt,
        IsAccepted: response.IsAccepted,
        AcceptedAt: response.AcceptedAt,
        CreatedAt: response.CreatedAt,
        RecommendedMaterial: response.RecommendedMaterial != null
            ? MaterialSummaryResponse.FromEntity(response.RecommendedMaterial)
            : null,
        CreatedBy: response.CreatedBy != null
            ? UserSummaryResponse.FromEntity(response.CreatedBy)
            : null
    );
}
namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Data for an admin to respond to a quote request with pricing.
/// </summary>
public record CreateQuoteResponseRequest(
    decimal Price,
    decimal? ShippingCost,
    int EstimatedDays,
    Guid? RecommendedMaterialId,
    string? RecommendedColor,
    string? TechnicalNotes,
    string? AlternativeOptions,
    int ExpiresInDays = 30);
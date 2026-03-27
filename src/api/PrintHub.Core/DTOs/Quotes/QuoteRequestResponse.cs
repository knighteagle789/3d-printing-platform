using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Quote request data returned by the API.
/// Includes nested responses if they exist.
/// </summary>
public record QuoteRequestResponse(
    Guid Id,
    string RequestNumber,
    string Status,
    int Quantity,
    string? PreferredColor,
    DateTime? RequiredByDate,
    string? SpecialRequirements,
    string? Notes,
    string? BudgetDisplay,
    DateTime CreatedAt,
    Guid? OrderId,
    FileSummaryResponse? File,
    MaterialSummaryResponse? PreferredMaterial,
    UserSummaryResponse? User,
    IReadOnlyList<QuoteResponseDto> Responses)
{
    public static QuoteRequestResponse FromEntity(QuoteRequest quote) => new(
        Id: quote.Id,
        RequestNumber: quote.RequestNumber,
        Status: quote.Status.ToString(),
        Quantity: quote.Quantity,
        PreferredColor: quote.PreferredColor,
        RequiredByDate: quote.RequiredByDate,
        SpecialRequirements: quote.SpecialRequirements,
        Notes: quote.Notes,
        BudgetDisplay: quote.GetBudgetDisplay(),
        CreatedAt: quote.CreatedAt,
        OrderId: quote.OrderId,
        File: quote.File != null
            ? FileSummaryResponse.FromEntity(quote.File)
            : null,
        PreferredMaterial: quote.PreferredMaterial != null
            ? MaterialSummaryResponse.FromEntity(quote.PreferredMaterial)
            : null,
        User: quote.User != null
            ? UserSummaryResponse.FromEntity(quote.User)
            : null,
        Responses: quote.Responses?.Select(QuoteResponseDto.FromEntity).ToList()
            ?? new List<QuoteResponseDto>()
    );
}
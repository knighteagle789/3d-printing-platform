using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Quote request data returned by the API.
/// Includes a per-file breakdown and nested responses if they exist.
/// </summary>
public record QuoteRequestResponse(
    Guid Id,
    string RequestNumber,
    string Status,
    DateTime? RequiredByDate,
    string? SpecialRequirements,
    string? Notes,
    string? BudgetDisplay,
    decimal? SetupFee,
    decimal? TotalMaterialCost,
    DateTime CreatedAt,
    Guid? OrderId,
    IReadOnlyList<QuoteFileItemResponse> Files,
    UserSummaryResponse? User,
    IReadOnlyList<QuoteResponseDto> Responses)
{
    public static QuoteRequestResponse FromEntity(QuoteRequest quote)
    {
        var totalMaterialCost = quote.Files.Sum(f => f.MaterialCost ?? 0m);

        return new QuoteRequestResponse(
            Id:                  quote.Id,
            RequestNumber:       quote.RequestNumber,
            Status:              quote.Status.ToString(),
            RequiredByDate:      quote.RequiredByDate,
            SpecialRequirements: quote.SpecialRequirements,
            Notes:               quote.Notes,
            BudgetDisplay:       quote.GetBudgetDisplay(),
            SetupFee:            quote.SetupFee,
            TotalMaterialCost:   totalMaterialCost > 0 ? totalMaterialCost : null,
            CreatedAt:           quote.CreatedAt,
            OrderId:             quote.OrderId,
            Files:               quote.Files.Select(QuoteFileItemResponse.FromEntity).ToList(),
            User:                quote.User != null ? UserSummaryResponse.FromEntity(quote.User) : null,
            Responses:           quote.Responses?.Select(QuoteResponseDto.FromEntity).ToList()
                                 ?? new List<QuoteResponseDto>()
        );
    }
}

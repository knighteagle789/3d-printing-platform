namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Data required to submit a new quote request.
/// Sent by a customer who wants pricing for a custom print job.
/// </summary>
public record CreateQuoteRequest(
    Guid? FileId,
    int Quantity,
    Guid? PreferredMaterialId,
    string? PreferredColor,
    DateTime? RequiredByDate,
    string? SpecialRequirements,
    string? Notes,
    string? BudgetRange,
    decimal? BudgetMin,
    decimal? BudgetMax);
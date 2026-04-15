namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// A single file entry within a multi-file quote request.
/// </summary>
public record QuoteFileItemRequest(
    Guid FileId,
    Guid? MaterialId,
    int Quantity,
    string? Color);

/// <summary>
/// Data required to submit a new quote request.
/// Supports one or more STL files in a single request.
/// </summary>
public record CreateQuoteRequest(
    IReadOnlyList<QuoteFileItemRequest> Files,
    DateTime? RequiredByDate,
    string? SpecialRequirements,
    string? Notes,
    string? BudgetRange,
    decimal? BudgetMin,
    decimal? BudgetMax);

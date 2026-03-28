using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for QuoteRequest and QuoteResponse entities.
/// Supports the customer quote request flow and admin quote management.
/// </summary>
public interface IQuoteRepository : IRepository<QuoteRequest>
{
    /// <summary>
    /// All quotes, optionally scoped to a user and/or status.
    /// Backs GET /Quotes?userId=&amp;status= (admin).
    /// </summary>
    Task<PagedResult<QuoteRequest>> GetAllQuotesAsync(
        Guid? userId, string? status = null, int page = 1, int pageSize = 20);

    Task<PagedResult<QuoteRequest>> GetUserQuotesAsync(Guid userId, int page = 1, int pageSize = 20);

    Task<QuoteRequest?> GetQuoteWithResponsesAsync(Guid quoteRequestId);

    Task<PagedResult<QuoteRequest>> GetPendingQuotesAsync(int page = 1, int pageSize = 20);

    Task<IReadOnlyList<QuoteRequest>> GetExpiringQuotesAsync(int withinDays = 7);

    /// <summary>Single GROUP BY query returning count per status. Backs GET /Quotes/status-counts.</summary>
    Task<Dictionary<string, int>> GetStatusCountsAsync();

    Task AddQuoteResponseAsync(QuoteResponse response);

    /// <summary>
    /// Returns lightweight projections of all quotes created within <paramref name="days"/> days,
    /// including their accepted response timestamps for time-to-conversion calculation.
    /// Used exclusively by the analytics service — no navigation properties loaded.
    /// </summary>
    Task<IReadOnlyList<QuoteAnalyticsRow>> GetConversionAnalyticsDataAsync(int days);
}

/// <summary>
/// Lightweight projection used only for analytics aggregation.
/// Avoids loading full entity graphs for what is purely a counting/timing query.
/// </summary>
public record QuoteAnalyticsRow(
    QuoteStatus Status,
    bool HasOrder,
    DateTime CreatedAt,
    DateTime? AcceptedAt,
    DateTime? OrderCreatedAt);
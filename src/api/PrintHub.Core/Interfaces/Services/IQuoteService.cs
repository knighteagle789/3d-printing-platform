using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.DTOs.Quotes;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for the quote request/response workflow.
/// Customers request quotes, admins respond with pricing.
/// </summary>
public interface IQuoteService
{
    // --- Customer operations ---
    Task<QuoteRequestResponse> CreateQuoteRequestAsync(
        Guid userId, CreateQuoteRequest request);
    Task<QuoteRequestResponse> GetQuoteByIdAsync(Guid quoteRequestId);
    Task<PagedResponse<QuoteRequestResponse>> GetUserQuotesAsync(
        Guid userId, int page = 1, int pageSize = 20);
    Task<QuoteRequestResponse> AcceptQuoteResponseAsync(
        Guid quoteRequestId, Guid quoteResponseId, Guid userId);

    // --- Admin operations ---

    /// <summary>
    /// All quotes, optionally filtered by user and/or status.
    /// Backs GET /Quotes?userId=&amp;status=
    /// </summary>
    Task<PagedResponse<QuoteRequestResponse>> GetAllQuotesAsync(
        Guid? userId, string? status = null, int page = 1, int pageSize = 20);

    Task<PagedResponse<QuoteRequestResponse>> GetPendingQuotesAsync(
        int page = 1, int pageSize = 20);
    Task<QuoteRequestResponse> AddQuoteResponseAsync(
        Guid quoteRequestId, CreateQuoteResponseRequest request, Guid adminUserId);
    Task<IReadOnlyList<QuoteRequestResponse>> GetExpiringQuotesAsync(int withinDays = 7);

    /// <summary>Count per status in a single query. Backs GET /Quotes/status-counts.</summary>
    Task<Dictionary<string, int>> GetStatusCountsAsync();

    Task<OrderResponse> ConvertToOrderAsync(Guid quoteRequestId, Guid userId);

    /// <summary>
    /// Aggregated conversion funnel analytics for the admin analytics page.
    /// Backs GET /Quotes/analytics?days=N (StaffOrAdmin only).
    /// </summary>
    Task<QuoteConversionAnalyticsResponse> GetConversionAnalyticsAsync(int days);
}
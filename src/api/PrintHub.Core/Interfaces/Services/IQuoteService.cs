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
    /// All quotes, optionally filtered to a specific user. Requires StaffOrAdmin.
    /// Backing GH #11: GET /Quotes?userId=&page=&pageSize=
    /// </summary>
    Task<PagedResponse<QuoteRequestResponse>> GetAllQuotesAsync(
        Guid? userId, int page = 1, int pageSize = 20);

    Task<PagedResponse<QuoteRequestResponse>> GetPendingQuotesAsync(
        int page = 1, int pageSize = 20);
    Task<QuoteRequestResponse> AddQuoteResponseAsync(
        Guid quoteRequestId, CreateQuoteResponseRequest request, Guid adminUserId);
    Task<IReadOnlyList<QuoteRequestResponse>> GetExpiringQuotesAsync(int withinDays = 7);

    Task<OrderResponse> ConvertToOrderAsync(Guid quoteRequestId, Guid userId);
}
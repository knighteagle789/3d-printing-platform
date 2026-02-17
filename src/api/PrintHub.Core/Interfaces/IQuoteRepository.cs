using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for QuoteRequest and QuoteResponse entities.
/// Supports the customer quote request flow and admin quote management.
/// </summary>
public interface IQuoteRepository : IRepository<QuoteRequest>
{
    Task<PagedResult<QuoteRequest>> GetUserQuotesAsync(Guid userId, int page = 1, int pageSize = 20);

    Task<QuoteRequest?> GetQuoteWithResponsesAsync(Guid quoteRequestId);

    Task<PagedResult<QuoteRequest>> GetPendingQuotesAsync(int page = 1, int pageSize = 20);

    Task<IReadOnlyList<QuoteRequest>> GetExpiringQuotesAsync(int withinDays = 7);

    Task AddQuoteResponseAsync(QuoteResponse response);
}
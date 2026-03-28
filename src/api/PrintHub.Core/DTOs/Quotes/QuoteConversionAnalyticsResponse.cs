namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Analytics snapshot for the quote-to-order conversion funnel.
/// Returned by GET /Quotes/analytics?days=N (StaffOrAdmin only).
/// All metrics are scoped to quotes created within the requested window.
/// </summary>
public record QuoteConversionAnalyticsResponse(
    /// <summary>Number of days this snapshot covers (30, 90, or 365).</summary>
    int WindowDays,

    // ── Volume ────────────────────────────────────────────────────────────────

    /// <summary>Total quote requests submitted in the window.</summary>
    int TotalQuotes,

    /// <summary>Quotes that were accepted by the customer.</summary>
    int AcceptedQuotes,

    /// <summary>Quotes that were declined by the customer.</summary>
    int DeclinedQuotes,

    /// <summary>Quotes that expired without a customer decision.</summary>
    int ExpiredQuotes,

    /// <summary>Accepted quotes that were converted to an order.</summary>
    int ConvertedQuotes,

    // ── Rates ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// Percentage of all quotes that resulted in a placed order.
    /// ConvertedQuotes / TotalQuotes. Null when TotalQuotes is zero.
    /// </summary>
    decimal? ConversionRate,

    /// <summary>
    /// Percentage of quotes that received a response and were accepted.
    /// AcceptedQuotes / (AcceptedQuotes + DeclinedQuotes + ExpiredQuotes).
    /// Null when no quotes reached a terminal state.
    /// </summary>
    decimal? AcceptanceRate,

    // ── Time-to-conversion ────────────────────────────────────────────────────

    /// <summary>
    /// Average calendar days between a quote being accepted and the resulting
    /// order being created. Null when no conversions exist in the window.
    /// </summary>
    decimal? AvgDaysToConversion,

    /// <summary>
    /// Fastest quote-to-order conversion in the window, in days.
    /// Null when no conversions exist.
    /// </summary>
    decimal? MinDaysToConversion,

    /// <summary>
    /// Slowest quote-to-order conversion in the window, in days.
    /// Null when no conversions exist.
    /// </summary>
    decimal? MaxDaysToConversion,

    // ── Revenue split ─────────────────────────────────────────────────────────

    /// <summary>Total revenue from orders that originated from a quote flow.</summary>
    decimal QuoteOriginatedRevenue,

    /// <summary>Total revenue from orders placed directly (no source quote).</summary>
    decimal DirectRevenue,

    /// <summary>Combined total revenue across both order types.</summary>
    decimal TotalRevenue,

    /// <summary>
    /// Percentage of total revenue that came from the quote flow.
    /// Null when TotalRevenue is zero.
    /// </summary>
    decimal? QuoteOriginatedRevenueShare
);
using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Core.DTOs.Orders;
using PrintHub.API.Extensions;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class QuotesController : ControllerBase
{
    private readonly IQuoteService _quoteService;

    public QuotesController(IQuoteService quoteService)
    {
        _quoteService = quoteService;
    }

    // ─── Customer endpoints ───────────────────────────────────────────────

    /// <summary>
    /// Submit a new quote request.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<QuoteRequestResponse>> CreateQuoteRequest(
        CreateQuoteRequest request)
    {
        var userId = User.GetUserId();
        var quote = await _quoteService.CreateQuoteRequestAsync(userId, request);
        return CreatedAtAction(
            nameof(GetQuote),
            new { id = quote.Id },
            quote);
    }

    /// <summary>
    /// Get a specific quote request by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QuoteRequestResponse>> GetQuote(Guid id)
    {
        var quote = await _quoteService.GetQuoteByIdAsync(id);

        // Customers can only see their own quotes
        var userId = User.GetUserId();
        if (quote.User?.Id != userId && !User.IsInRole("Admin") && !User.IsInRole("Staff"))
            return NotFound();

        return Ok(quote);
    }

    /// <summary>
    /// Get the current user's quote requests.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<PagedResponse<QuoteRequestResponse>>> GetMyQuotes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var quotes = await _quoteService.GetUserQuotesAsync(userId, page, pageSize);
        return Ok(quotes);
    }

    /// <summary>
    /// Accept a specific quote response (pricing proposal).
    /// </summary>
    [HttpPost("{quoteId:guid}/responses/{responseId:guid}/accept")]
    public async Task<ActionResult<QuoteRequestResponse>> AcceptQuoteResponse(
        Guid quoteId, Guid responseId)
    {
        var userId = User.GetUserId();
        var quote = await _quoteService.AcceptQuoteResponseAsync(quoteId, responseId, userId);
        return Ok(quote);
    }

    /// <summary>
    /// Convert an accepted quote to an order.
    /// </summary>
    [HttpPost("{id:guid}/convert-to-order")]
    public async Task<ActionResult<OrderResponse>> ConvertToOrder(Guid id)
    {
        var userId = User.GetUserId();
        var order = await _quoteService.ConvertQuoteToOrderAsync(id, userId);
        return CreatedAtAction("GetOrder", "Orders", new { id = order.Id }, order);
    }

    // ─── Admin endpoints ──────────────────────────────────────────────────

    /// <summary>
    /// Get all pending quote requests. Requires Staff or Admin role.
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<PagedResponse<QuoteRequestResponse>>> GetPendingQuotes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var quotes = await _quoteService.GetPendingQuotesAsync(page, pageSize);
        return Ok(quotes);
    }

    /// <summary>
    /// Add a pricing response to a quote request. Requires Staff or Admin role.
    /// </summary>
    [HttpPost("{quoteId:guid}/responses")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<QuoteRequestResponse>> AddQuoteResponse(
        Guid quoteId, CreateQuoteResponseRequest request)
    {
        var userId = User.GetUserId();
        var quote = await _quoteService.AddQuoteResponseAsync(quoteId, request, userId);
        return Ok(quote);
    }

    /// <summary>
    /// Get quotes with responses expiring soon. Requires Staff or Admin role.
    /// </summary>
    [HttpGet("expiring")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<IReadOnlyList<QuoteRequestResponse>>> GetExpiringQuotes(
        [FromQuery] int withinDays = 7)
    {
        var quotes = await _quoteService.GetExpiringQuotesAsync(withinDays);
        return Ok(quotes);
    }

    // ─── Private helpers ──────────────────────────────────────────────────

}
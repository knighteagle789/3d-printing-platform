using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class QuoteService : IQuoteService
{
    private readonly IQuoteRepository _quoteRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<QuoteService> _logger;

    public QuoteService(
        IQuoteRepository quoteRepo,
        IUnitOfWork unitOfWork,
        ILogger<QuoteService> logger)
    {
        _quoteRepo = quoteRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // --- Customer operations ---

    public async Task<QuoteRequestResponse> CreateQuoteRequestAsync(
        Guid userId, CreateQuoteRequest request)
    {
        var quote = new QuoteRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RequestNumber = await GenerateRequestNumberAsync(),
            Status = QuoteStatus.Pending,
            FileId = request.FileId,
            Quantity = request.Quantity,
            PreferredMaterialId = request.PreferredMaterialId,
            PreferredColor = request.PreferredColor,
            RequiredByDate = request.RequiredByDate,
            SpecialRequirements = request.SpecialRequirements,
            Notes = request.Notes,
            BudgetRangeOption = request.BudgetRange != null
                ? Enum.Parse<BudgetRange>(request.BudgetRange, ignoreCase: true)
                : null,
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            CreatedAt = DateTime.UtcNow
        };

        await _quoteRepo.AddAsync(quote);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Quote request created: {RequestNumber} by user {UserId}",
            quote.RequestNumber, userId);

        var created = await _quoteRepo.GetQuoteWithResponsesAsync(quote.Id);
        return QuoteRequestResponse.FromEntity(created!);
    }

    public async Task<QuoteRequestResponse> GetQuoteByIdAsync(Guid quoteRequestId)
    {
        var quote = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        if (quote == null)
            throw new NotFoundException("Quote request", quoteRequestId);
        return QuoteRequestResponse.FromEntity(quote);
    }

    public async Task<PagedResponse<QuoteRequestResponse>> GetUserQuotesAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        var quotes = await _quoteRepo.GetUserQuotesAsync(userId, page, pageSize);
        return PagedResponse<QuoteRequestResponse>.FromPagedResult(
            quotes, QuoteRequestResponse.FromEntity);
    }

    public async Task<QuoteRequestResponse> AcceptQuoteResponseAsync(
        Guid quoteRequestId, Guid quoteResponseId, Guid userId)
    {
        var quote = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        if (quote == null)
            throw new NotFoundException("Quote request", quoteRequestId);

        // Verify the customer owns this quote
        if (quote.UserId != userId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to accept quote {QuoteId} owned by {OwnerId}",
                userId, quoteRequestId, quote.UserId);
            throw new ForbiddenException("You do not have permission to accept this quote.");
        }

        // Find the specific response
        var response = quote.Responses.FirstOrDefault(r => r.Id == quoteResponseId);
        if (response == null)
            throw new NotFoundException("Quote response", quoteResponseId);

        // Check if already accepted
        if (quote.Status == QuoteStatus.Accepted)
            throw new BusinessRuleException("This quote has already been accepted.");

        // Check if expired
        if (response.ExpiresAt < DateTime.UtcNow)
            throw new BusinessRuleException("This quote response has expired.");

        // Accept the response
        response.IsAccepted = true;
        response.AcceptedAt = DateTime.UtcNow;
        quote.Status = QuoteStatus.Accepted;

        _quoteRepo.Update(quote);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Quote {RequestNumber} accepted by user {UserId}, price: {Price:C}",
            quote.RequestNumber, userId, response.Price);

        var updated = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        return QuoteRequestResponse.FromEntity(updated!);
    }

    // --- Admin operations ---

    public async Task<PagedResponse<QuoteRequestResponse>> GetPendingQuotesAsync(
        int page = 1, int pageSize = 20)
    {
        var quotes = await _quoteRepo.GetPendingQuotesAsync(page, pageSize);
        return PagedResponse<QuoteRequestResponse>.FromPagedResult(
            quotes, QuoteRequestResponse.FromEntity);
    }

    public async Task<QuoteRequestResponse> AddQuoteResponseAsync(
        Guid quoteRequestId, CreateQuoteResponseRequest request, Guid adminUserId)
    {
        var quote = await _quoteRepo.GetByIdAsync(quoteRequestId);
        if (quote == null)
            throw new NotFoundException("Quote request", quoteRequestId);

        var response = new QuoteResponse
        {
            Id = Guid.NewGuid(),
            QuoteRequestId = quoteRequestId,
            Price = request.Price,
            ShippingCost = request.ShippingCost,
            EstimatedDays = request.EstimatedDays,
            RecommendedMaterialId = request.RecommendedMaterialId,
            RecommendedColor = request.RecommendedColor,
            TechnicalNotes = request.TechnicalNotes,
            AlternativeOptions = request.AlternativeOptions,
            ExpiresAt = DateTime.UtcNow.AddDays(request.ExpiresInDays),
            CreatedByUserId = adminUserId,
            CreatedAt = DateTime.UtcNow
        };

        // Update quote status to show a response has been provided
        quote.Status = QuoteStatus.QuoteProvided;
        _quoteRepo.Update(quote);

        await _quoteRepo.AddQuoteResponseAsync(response);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Quote response added to {RequestNumber} by admin {AdminId}, price: {Price:C}",
            quote.RequestNumber, adminUserId, request.Price);

        var updated = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        return QuoteRequestResponse.FromEntity(updated!);
    }

    public async Task<IReadOnlyList<QuoteRequestResponse>> GetExpiringQuotesAsync(
        int withinDays = 7)
    {
        var quotes = await _quoteRepo.GetExpiringQuotesAsync(withinDays);
        return quotes.Select(QuoteRequestResponse.FromEntity).ToList();
    }

    // --- Private helpers ---

    private async Task<string> GenerateRequestNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await _quoteRepo.CountAsync() + 1;
        return $"QR-{year}-{count:D5}";
    }
}
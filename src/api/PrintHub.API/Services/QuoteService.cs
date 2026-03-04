using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class QuoteService : IQuoteService
{
    private readonly IQuoteRepository _quoteRepo;
    private readonly IOrderRepository _orderRepo;
    private readonly IMaterialRepository _materialRepo;
    private readonly IFileRepository _fileRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<QuoteService> _logger;

    public QuoteService(
        IQuoteRepository quoteRepo,
        IOrderRepository orderRepo,
        IMaterialRepository materialRepo,
        IFileRepository fileRepo,
        IUnitOfWork unitOfWork,
        ILogger<QuoteService> logger)
    {
        _quoteRepo = quoteRepo;
        _orderRepo = orderRepo;
        _materialRepo = materialRepo;
        _fileRepo = fileRepo;
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
            RequiredByDate = request.RequiredByDate.HasValue
                ? DateTime.SpecifyKind(request.RequiredByDate.Value, DateTimeKind.Utc)
                : null,
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

    public async Task<OrderResponse> ConvertQuoteToOrderAsync(Guid quoteRequestId, Guid userId)
    {
        var quote = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        if (quote == null)
            throw new NotFoundException("Quote request", quoteRequestId);

        // Ownership check
        if (quote.UserId != userId)
            throw new ForbiddenException("You do not have permission to convert this quote.");

        // Must be accepted
        if (quote.Status != QuoteStatus.Accepted)
            throw new BusinessRuleException("Only accepted quotes can be converted to orders.");

        // Prevent duplicate conversion
        if (quote.OrderId != null)
            throw new BusinessRuleException("This quote has already been converted to an order.");

        // Must have a file
        if (quote.FileId == null)
            throw new BusinessRuleException("Cannot convert a quote without an uploaded file.");

        // Get the accepted response
        var acceptedResponse = quote.Responses.FirstOrDefault(r => r.IsAccepted);
        if (acceptedResponse == null)
            throw new BusinessRuleException("No accepted response found on this quote.");

        // Resolve material — prefer recommended, fall back to preferred
        var materialId = acceptedResponse.RecommendedMaterialId ?? quote.PreferredMaterialId;
        if (materialId == null)
            throw new BusinessRuleException(
                "Cannot convert quote to order: no material specified. " +
                "Please contact us to update the quote with a material.");

        var material = await _materialRepo.GetByIdAsync(materialId.Value);
        if (material == null)
            throw new NotFoundException("Material", materialId.Value);

        var file = await _fileRepo.GetFileWithAnalysisAsync(quote.FileId.Value);
        if (file == null)
            throw new NotFoundException("File", quote.FileId.Value);

        // Resolve color
        var color = acceptedResponse.RecommendedColor ?? quote.PreferredColor;

        // Unit price = accepted price / quantity
        var unitPrice = Math.Round(acceptedResponse.Price / quote.Quantity, 2);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OrderNumber = await GenerateOrderNumberAsync(),
            Status = OrderStatus.Submitted,
            TotalPrice = acceptedResponse.Price,
            ShippingCost = acceptedResponse.ShippingCost,
            RequiredByDate = quote.RequiredByDate,
            Notes = quote.SpecialRequirements ?? quote.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        order.Items.Add(new OrderItem
        {
            Id = Guid.NewGuid(),
            MaterialId = materialId.Value,
            FileId = quote.FileId.Value,
            Quantity = quote.Quantity,
            UnitPrice = unitPrice,
            TotalPrice = acceptedResponse.Price,
            Color = color,
            SpecialInstructions = quote.SpecialRequirements,
            EstimatedWeight = file.Analysis?.EstimatedWeightGrams,
            EstimatedPrintTime = file.Analysis?.EstimatedPrintTimeHours,
            Quality = PrintQuality.Standard,
            Infill = 20,
            CreatedAt = DateTime.UtcNow,
        });

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            Status = OrderStatus.Submitted,
            Notes = $"Order created from quote {quote.RequestNumber}",
            ChangedAt = DateTime.UtcNow,
        });

        await _orderRepo.AddAsync(order);

        // Link the quote to the order
        quote.OrderId = order.Id;
        _quoteRepo.Update(quote);

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Quote {RequestNumber} converted to order {OrderNumber} by user {UserId}",
            quote.RequestNumber, order.OrderNumber, userId);

        var created = await _orderRepo.GetOrderWithDetailsAsync(order.Id);
        return OrderResponse.FromEntity(created!);
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

    private async Task<string> GenerateOrderNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await _orderRepo.CountAsync() + 1;
        return $"ORD-{year}-{count:D5}";
    }
}
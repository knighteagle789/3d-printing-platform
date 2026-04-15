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
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<QuoteService> _logger;

    public QuoteService(
        IQuoteRepository quoteRepo,
        IOrderRepository orderRepo,
        IMaterialRepository materialRepo,
        IFileRepository fileRepo,
        IEmailService emailService,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ILogger<QuoteService> logger)
    {
        _quoteRepo = quoteRepo;
        _orderRepo = orderRepo;
        _materialRepo = materialRepo;
        _fileRepo = fileRepo;
        _emailService = emailService;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // CR-10 build volume limits (mm)
    private const decimal BuildVolumeX = 300m;
    private const decimal BuildVolumeY = 300m;
    private const decimal BuildVolumeZ = 400m;
    private const int MaxFilesPerQuote = 25;

    // --- Customer operations ---

    public async Task<QuoteRequestResponse> CreateQuoteRequestAsync(
        Guid userId, CreateQuoteRequest request)
    {
        if (request.Files.Count == 0)
            throw new BusinessRuleException("At least one file is required.");

        if (request.Files.Count > MaxFilesPerQuote)
            throw new BusinessRuleException(
                $"A maximum of {MaxFilesPerQuote} files may be included in a single quote request.");

        // Fetch all files and materials concurrently, then build QuoteRequestFile entries.
        var fileEntities = await Task.WhenAll(
            request.Files.Select(f => _fileRepo.GetFileWithAnalysisAsync(f.FileId)));

        var quoteFiles = new List<QuoteRequestFile>();

        for (var i = 0; i < request.Files.Count; i++)
        {
            var item = request.Files[i];
            var file = fileEntities[i];

            if (file == null)
                throw new NotFoundException("File", item.FileId);

            if (file.UserId != userId)
            {
                _logger.LogWarning(
                    "User {UserId} attempted to quote file {FileId} owned by {OwnerId}",
                    userId, item.FileId, file.UserId);
                throw new ForbiddenException("You do not have access to one or more of the specified files.");
            }

            var analysis = file.Analysis;

            // Snapshot dimensions from analysis at quote creation time.
            var dimX = analysis?.DimensionX;
            var dimY = analysis?.DimensionY;
            var dimZ = analysis?.DimensionZ;

            var exceedsBuildVolume =
                (dimX.HasValue && dimX.Value > BuildVolumeX) ||
                (dimY.HasValue && dimY.Value > BuildVolumeY) ||
                (dimZ.HasValue && dimZ.Value > BuildVolumeZ);

            // Compute material cost snapshot if both material and weight are known.
            decimal? materialCost = null;
            Material? material = null;

            if (item.MaterialId.HasValue)
            {
                material = await _materialRepo.GetByIdAsync(item.MaterialId.Value);
                if (material == null)
                    throw new NotFoundException("Material", item.MaterialId.Value);

                if (analysis?.EstimatedWeightGrams.HasValue == true)
                {
                    materialCost = Math.Round(
                        analysis.EstimatedWeightGrams.Value * material.PricePerGram * item.Quantity,
                        2);
                }
            }

            quoteFiles.Add(new QuoteRequestFile
            {
                Id = Guid.NewGuid(),
                FileId = item.FileId,
                MaterialId = item.MaterialId,
                Quantity = item.Quantity,
                Color = item.Color,
                DimensionX = dimX,
                DimensionY = dimY,
                DimensionZ = dimZ,
                EstimatedWeightGrams = analysis?.EstimatedWeightGrams,
                EstimatedPrintTimeHours = analysis?.EstimatedPrintTimeHours,
                MaterialCost = materialCost,
                ExceedsBuildVolume = exceedsBuildVolume,
                CreatedAt = DateTime.UtcNow,
            });
        }

        var quote = new QuoteRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RequestNumber = await GenerateRequestNumberAsync(),
            Status = QuoteStatus.Pending,
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
            CreatedAt = DateTime.UtcNow,
            Files = quoteFiles,
        };

        await _quoteRepo.AddAsync(quote);
        await _unitOfWork.SaveChangesAsync();

        var fileCount = request.Files.Count;
        _ = Task.Run(async () =>
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null) return;
            await _emailService.SendQuoteRequestReceivedAsync(
                user.Email, user.FirstName, quote.RequestNumber);
            await _emailService.SendNewQuoteRequestAdminAsync(
                quote.RequestNumber,
                $"{user.FullName}",
                fileCount > 0 ? $"{fileCount} file(s) attached" : null);
        });

        _logger.LogInformation(
            "Quote request {RequestNumber} created by user {UserId} with {FileCount} file(s)",
            quote.RequestNumber, userId, quoteFiles.Count);

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

        if (quote.UserId != userId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to accept quote {QuoteId} owned by {OwnerId}",
                userId, quoteRequestId, quote.UserId);
            throw new ForbiddenException("You do not have permission to accept this quote.");
        }

        var response = quote.Responses.FirstOrDefault(r => r.Id == quoteResponseId);
        if (response == null)
            throw new NotFoundException("Quote response", quoteResponseId);

        if (quote.Status == QuoteStatus.Accepted)
            throw new BusinessRuleException("This quote has already been accepted.");

        if (response.ExpiresAt < DateTime.UtcNow)
            throw new BusinessRuleException("This quote response has expired.");

        response.IsAccepted = true;
        response.AcceptedAt = DateTime.UtcNow;
        quote.Status = QuoteStatus.Accepted;

        _quoteRepo.Update(quote);
        await _unitOfWork.SaveChangesAsync();

        _ = Task.Run(async () =>
        {
            await _emailService.SendQuoteAcceptedConfirmationAsync(
                quote.User.Email, quote.User.FirstName, quote.RequestNumber);
        });

        _logger.LogInformation(
            "Quote {RequestNumber} accepted by user {UserId}, price: {Price:C}",
            quote.RequestNumber, userId, response.Price);

        var updated = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        return QuoteRequestResponse.FromEntity(updated!);
    }

    public async Task<OrderResponse> ConvertToOrderAsync(Guid quoteRequestId, Guid userId)
    {
        var quote = await _quoteRepo.GetQuoteWithResponsesAsync(quoteRequestId);
        if (quote == null)
            throw new NotFoundException("Quote request", quoteRequestId);

        if (quote.UserId != userId)
            throw new ForbiddenException("You do not have permission to convert this quote.");

        if (quote.Status != QuoteStatus.Accepted)
            throw new BusinessRuleException("Only accepted quotes can be converted to orders.");

        if (quote.OrderId != null)
            throw new BusinessRuleException("This quote has already been converted to an order.");

        if (!quote.Files.Any())
            throw new BusinessRuleException("Cannot convert a quote with no attached files.");

        var acceptedResponse = quote.Responses.FirstOrDefault(r => r.IsAccepted);
        if (acceptedResponse == null)
            throw new BusinessRuleException("No accepted response found on this quote.");

        // Distribute the accepted price across order items proportionally by material cost.
        // Fall back to equal distribution if no material costs were captured.
        var totalWeightedCost = quote.Files.Sum(f => f.MaterialCost ?? 0m);
        var distributeEqually = totalWeightedCost == 0m;
        var fileCount = quote.Files.Count;
        var totalPrice = acceptedResponse.Price;

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OrderNumber = await GenerateOrderNumberAsync(),
            Status = OrderStatus.Submitted,
            TotalPrice = totalPrice,
            ShippingCost = acceptedResponse.ShippingCost,
            RequiredByDate = quote.RequiredByDate,
            Notes = quote.SpecialRequirements ?? quote.Notes,
            CreatedAt = DateTime.UtcNow,
            QuoteRequestId = quote.Id,
        };

        decimal allocatedTotal = 0m;
        var fileList = quote.Files.ToList();

        for (var i = 0; i < fileList.Count; i++)
        {
            var qf = fileList[i];
            var isLast = i == fileList.Count - 1;

            // Resolve material: per-file material, then response recommendation, then fail.
            var materialId = qf.MaterialId ?? acceptedResponse.RecommendedMaterialId;
            if (materialId == null)
                throw new BusinessRuleException(
                    $"Cannot convert quote to order: no material specified for file '{qf.File?.OriginalFileName ?? qf.FileId.ToString()}'. " +
                    "Please contact us to update the quote.");

            // Proportional item total price — last item gets the remainder to avoid rounding drift.
            decimal itemTotal;
            if (isLast)
            {
                itemTotal = totalPrice - allocatedTotal;
            }
            else if (distributeEqually)
            {
                itemTotal = Math.Round(totalPrice / fileCount, 2);
            }
            else
            {
                var proportion = (qf.MaterialCost ?? 0m) / totalWeightedCost;
                itemTotal = Math.Round(totalPrice * proportion, 2);
            }

            allocatedTotal += itemTotal;
            var unitPrice = qf.Quantity > 0 ? Math.Round(itemTotal / qf.Quantity, 2) : itemTotal;

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                MaterialId = materialId.Value,
                FileId = qf.FileId,
                Quantity = qf.Quantity,
                UnitPrice = unitPrice,
                TotalPrice = itemTotal,
                Color = acceptedResponse.RecommendedColor ?? qf.Color,
                SpecialInstructions = quote.SpecialRequirements,
                EstimatedWeight = qf.EstimatedWeightGrams,
                EstimatedPrintTime = qf.EstimatedPrintTimeHours,
                Quality = PrintQuality.Standard,
                Infill = 20,
                CreatedAt = DateTime.UtcNow,
            });
        }

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            Status = OrderStatus.Submitted,
            Notes = $"Order created from quote {quote.RequestNumber}",
            ChangedAt = DateTime.UtcNow,
        });

        await _orderRepo.AddAsync(order);

        quote.OrderId = order.Id;
        _quoteRepo.Update(quote);

        await _unitOfWork.SaveChangesAsync();

        _ = Task.Run(async () =>
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null) return;
            await _emailService.SendOrderStatusUpdateAsync(
                user.Email, user.FirstName, order.OrderNumber, "Submitted");
            await _emailService.SendNewOrderAdminAsync(
                order.OrderNumber,
                $"{user.FullName}",
                order.TotalPrice);
        });

        _logger.LogInformation(
            "Quote {RequestNumber} converted to order {OrderNumber} with {ItemCount} item(s) by user {UserId}",
            quote.RequestNumber, order.OrderNumber, fileList.Count, userId);

        var created = await _orderRepo.GetOrderWithDetailsAsync(order.Id);
        return OrderResponse.FromEntity(created!);
    }

    // --- Admin operations ---

    /// <summary>
    /// All quotes, optionally scoped to a specific user. Backs GH #11: GET /Quotes?userId=
    /// </summary>
    public async Task<PagedResponse<QuoteRequestResponse>> GetAllQuotesAsync(
        Guid? userId, string? status = null, int page = 1, int pageSize = 20)
    {
        var quotes = await _quoteRepo.GetAllQuotesAsync(userId, status, page, pageSize);
        return PagedResponse<QuoteRequestResponse>.FromPagedResult(
            quotes, QuoteRequestResponse.FromEntity);
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync()
    {
        return await _quoteRepo.GetStatusCountsAsync();
    }

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

        quote.Status = QuoteStatus.QuoteProvided;
        _quoteRepo.Update(quote);

        await _quoteRepo.AddQuoteResponseAsync(response);
        await _unitOfWork.SaveChangesAsync();

        // Capture email primitives before the fire-and-forget so the lambda
        // doesn't touch the DbContext after the main request has finished with it.
        var user = await _userRepo.GetByIdAsync(quote.UserId);
        var toEmail = user?.Email;
        var toFirstName = user?.FirstName;
        var requestNumber = quote.RequestNumber;
        var emailPrice = response.Price;
        var emailEstimatedDays = response.EstimatedDays;

        _ = Task.Run(async () =>
        {
            if (toEmail != null)
            {
                await _emailService.SendQuoteResponseProvidedAsync(
                    toEmail,
                    toFirstName ?? string.Empty,
                    requestNumber,
                    emailPrice,
                    emailEstimatedDays);
            }
        });

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

    public async Task<QuoteConversionAnalyticsResponse> GetConversionAnalyticsAsync(int days)
    {
        // Run both repo queries concurrently — they touch different tables.
        var rows     = await _quoteRepo.GetConversionAnalyticsDataAsync(days);
        var revenue  = await _orderRepo.GetRevenueBySourceAsync(days);

        // ── Volume counts ────────────────────────────────────────────────────────────────────────
        var total     = rows.Count;
        var accepted  = rows.Count(r => r.Status == QuoteStatus.Accepted);
        var declined  = rows.Count(r => r.Status == QuoteStatus.Declined);
        var expired   = rows.Count(r => r.Status == QuoteStatus.Expired);
        var converted = rows.Count(r => r.HasOrder);

        // ── Rates ─────────────────────────────────────────────────────────────────────────────
        var conversionRate = total > 0
            ? Math.Round((decimal)converted / total * 100, 1)
            : (decimal?)null;

        var terminalCount = accepted + declined + expired;
        var acceptanceRate = terminalCount > 0
            ? Math.Round((decimal)accepted / terminalCount * 100, 1)
            : (decimal?)null;

        // ── Time-to-conversion ────────────────────────────────────────────────────────────────
        // Duration from quote accepted → order created, in fractional days.
        var conversionDurations = rows
            .Where(r => r.HasOrder && r.AcceptedAt.HasValue && r.OrderCreatedAt.HasValue)
            .Select(r => (decimal)(r.OrderCreatedAt!.Value - r.AcceptedAt!.Value).TotalDays)
            .ToList();

        decimal? avgDays = conversionDurations.Count > 0
            ? Math.Round(conversionDurations.Average(), 1)
            : null;

        decimal? minDays = conversionDurations.Count > 0
            ? Math.Round(conversionDurations.Min(), 1)
            : null;

        decimal? maxDays = conversionDurations.Count > 0
            ? Math.Round(conversionDurations.Max(), 1)
            : null;

        // ── Revenue ───────────────────────────────────────────────────────────────────────────
        var totalRevenue = revenue.QuoteOriginated + revenue.Direct;
        var revenueShare = totalRevenue > 0
            ? Math.Round(revenue.QuoteOriginated / totalRevenue * 100, 1)
            : (decimal?)null;

        return new QuoteConversionAnalyticsResponse(
            WindowDays: days,
            TotalQuotes: total,
            AcceptedQuotes: accepted,
            DeclinedQuotes: declined,
            ExpiredQuotes: expired,
            ConvertedQuotes: converted,
            ConversionRate: conversionRate,
            AcceptanceRate: acceptanceRate,
            AvgDaysToConversion: avgDays,
            MinDaysToConversion: minDays,
            MaxDaysToConversion: maxDays,
            QuoteOriginatedRevenue: revenue.QuoteOriginated,
            DirectRevenue: revenue.Direct,
            TotalRevenue: totalRevenue,
            QuoteOriginatedRevenueShare: revenueShare
        );
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

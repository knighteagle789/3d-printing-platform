using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Core.Common;
using PrintHub.Core.Exceptions;
using System.Configuration;

namespace PrintHub.API.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepo;
    private readonly IMaterialRepository _materialRepo;
    private readonly IFileRepository _fileRepo;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<OrderService> _logger;
    private readonly decimal _machineRatePerHour;
    private readonly decimal _handlingFeePerModel;

    public OrderService(
        IOrderRepository orderRepo,
        IMaterialRepository materialRepo,
        IFileRepository fileRepo,
        IEmailService emailService,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        ILogger<OrderService> logger)
    {
        _orderRepo = orderRepo;
        _materialRepo = materialRepo;
        _fileRepo = fileRepo;
        _emailService = emailService;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _machineRatePerHour = configuration.GetValue<decimal>("Pricing:MachineRatePerHour", 3.50m);
        _handlingFeePerModel = configuration.GetValue<decimal>("Pricing:HandlingFeePerModel", 4.00m);
    }

    // --- Customer operations ---

    public async Task<OrderResponse> CreateOrderAsync(
        Guid userId, CreateOrderRequest request)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            OrderNumber = await GenerateOrderNumberAsync(),
            Status = OrderStatus.Draft,
            Notes = request.Notes,
            ShippingAddress = request.ShippingAddress,
            RequiredByDate = request.RequiredByDate,
            CreatedAt = DateTime.UtcNow
        };

        decimal totalPrice = 0;

        foreach (var itemRequest in request.Items)
        {
            var material = await _materialRepo.GetByIdAsync(itemRequest.MaterialId);
            if (material == null)
                throw new NotFoundException("Material", itemRequest.MaterialId);

            if (!material.IsActive)
                throw new BusinessRuleException(
                    $"Material is no longer available: {material.Type} {material.Color}");

            var file = await _fileRepo.GetFileWithAnalysisAsync(itemRequest.FileId);
            if (file == null)
                throw new NotFoundException("File", itemRequest.FileId);

            var unitPrice = CalculateUnitPrice(material, file, itemRequest);
            var machineCost = CalculateMachineCost(file, itemRequest.Quantity);

            var orderItem = new OrderItem
            {
                Id = Guid.NewGuid(),
                MaterialId = itemRequest.MaterialId,
                FileId = itemRequest.FileId,
                Quantity = itemRequest.Quantity,
                UnitPrice = unitPrice,
                TotalPrice = unitPrice * itemRequest.Quantity + machineCost + _handlingFeePerModel,
                MachineCost = machineCost > 0 ? machineCost : null,
                HandlingFee = _handlingFeePerModel,
                Color = itemRequest.Color,
                SpecialInstructions = itemRequest.SpecialInstructions,
                Quality = Enum.Parse<PrintQuality>(itemRequest.Quality, ignoreCase: true),
                Infill = itemRequest.Infill ?? 20,
                SupportStructures = itemRequest.SupportStructures,
                EstimatedWeight = file.Analysis?.EstimatedWeightGrams,
                EstimatedPrintTime = file.Analysis?.EstimatedPrintTimeHours,
                CreatedAt = DateTime.UtcNow
            };

            order.Items.Add(orderItem);
            totalPrice += orderItem.TotalPrice;
        }

        order.TotalPrice = totalPrice;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            Status = OrderStatus.Draft,
            Notes = "Order created",
            ChangedAt = DateTime.UtcNow
        });

        await _orderRepo.AddAsync(order);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Order created: {OrderNumber} by user {UserId}, total: {TotalPrice:C}",
            order.OrderNumber, userId, totalPrice);

        var created = await _orderRepo.GetOrderWithDetailsAsync(order.Id);

        // Notify admin of new order
        if (created?.User != null)
        {
            var customerName = $"{created.User.FirstName} {created.User.LastName}";
            await _emailService.SendNewOrderAdminAsync(
                created.OrderNumber, customerName, totalPrice);
        }

        return OrderResponse.FromEntity(created!);
    }

    public async Task<OrderResponse> UpdateOrderAsync(
        Guid orderId, Guid userId, UpdateOrderRequest request)
    {
        // Load the order header only — avoids navigation-collection change-tracker
        // conflicts that arise when clearing and re-adding items on a tracked aggregate.
        var order = await _orderRepo.GetByIdAsync(orderId);
        if (order == null)
            throw new NotFoundException("Order", orderId);

        if (order.UserId != userId)
            throw new ForbiddenException("You do not have permission to edit this order.");

        if (order.Status != OrderStatus.Draft)
            throw new BusinessRuleException(
                $"Only Draft orders can be edited. This order is currently {order.Status}.");

        // Build replacement items
        var newItems = new List<OrderItem>();
        decimal totalPrice = 0;

        foreach (var itemRequest in request.Items)
        {
            var material = await _materialRepo.GetByIdAsync(itemRequest.MaterialId);
            if (material == null)
                throw new NotFoundException("Material", itemRequest.MaterialId);

            if (!material.IsActive)
                throw new BusinessRuleException(
                    $"Material is no longer available: {material.Type} {material.Color}");

            var file = await _fileRepo.GetFileWithAnalysisAsync(itemRequest.FileId);
            if (file == null)
                throw new NotFoundException("File", itemRequest.FileId);

            var unitPrice   = CalculateUnitPrice(material, file, itemRequest);
            var machineCost = CalculateMachineCost(file, itemRequest.Quantity);

            var orderItem = new OrderItem
            {
                Id                  = Guid.NewGuid(),
                OrderId             = orderId,
                MaterialId          = itemRequest.MaterialId,
                FileId              = itemRequest.FileId,
                Quantity            = itemRequest.Quantity,
                UnitPrice           = unitPrice,
                TotalPrice          = unitPrice * itemRequest.Quantity + machineCost + _handlingFeePerModel,
                MachineCost         = machineCost > 0 ? machineCost : null,
                HandlingFee         = _handlingFeePerModel,
                Color               = itemRequest.Color,
                SpecialInstructions = itemRequest.SpecialInstructions,
                Quality             = Enum.Parse<PrintQuality>(itemRequest.Quality, ignoreCase: true),
                Infill              = itemRequest.Infill ?? 20,
                SupportStructures   = itemRequest.SupportStructures,
                EstimatedWeight     = file.Analysis?.EstimatedWeightGrams,
                EstimatedPrintTime  = file.Analysis?.EstimatedPrintTimeHours,
                CreatedAt           = DateTime.UtcNow
            };

            newItems.Add(orderItem);
            totalPrice += orderItem.TotalPrice;
        }

        // Atomically swap items via the DbSet — bypasses the navigation collection
        // so EF sees clean Deleted + Added states with no ambiguity.
        await _orderRepo.ReplaceItemsAsync(orderId, newItems);

        // Update order header (entity is tracked from GetByIdAsync above)
        order.TotalPrice      = totalPrice;
        order.Notes           = request.Notes;
        order.ShippingAddress = request.ShippingAddress;
        order.RequiredByDate  = request.RequiredByDate;
        order.UpdatedAt       = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation(
            "Draft order updated: {OrderNumber} by user {UserId}, new total: {TotalPrice:C}",
            order.OrderNumber, userId, totalPrice);

        var updated = await _orderRepo.GetOrderWithDetailsAsync(order.Id);
        return OrderResponse.FromEntity(updated!);
    }

    public async Task<OrderResponse> GetOrderByIdAsync(Guid orderId)
    {
        var order = await _orderRepo.GetOrderWithDetailsAsync(orderId);
        if (order == null)
            throw new NotFoundException("Order", orderId);
        return OrderResponse.FromEntity(order);
    }

    public async Task<PagedResponse<OrderResponse>> GetUserOrdersAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        var orders = await _orderRepo.GetUserOrdersAsync(userId, page, pageSize);
        return PagedResponse<OrderResponse>.FromPagedResult(
            orders, OrderResponse.FromEntity);
    }

    // --- Admin operations ---

    /// <summary>
    /// All orders, optionally scoped to a specific user. Backs GH #10: GET /Orders?userId=
    /// </summary>
    public async Task<PagedResponse<OrderResponse>> GetAllOrdersAsync(
        Guid? userId, int page = 1, int pageSize = 20)
    {
        var orders = await _orderRepo.GetAllOrdersAsync(userId, page, pageSize);
        return PagedResponse<OrderResponse>.FromPagedResult(
            orders, OrderResponse.FromEntity);
    }

    public async Task<PagedResponse<OrderResponse>> GetOrdersByStatusAsync(
        string status, int page = 1, int pageSize = 20)
    {
        if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var orderStatus))
            throw new BusinessRuleException($"'{status}' is not a valid order status.");

        var orders = await _orderRepo.GetOrdersByStatusAsync(orderStatus, page, pageSize);
        return PagedResponse<OrderResponse>.FromPagedResult(
            orders, OrderResponse.FromEntity);
    }

    public async Task<IReadOnlyList<OrderResponse>> GetRecentOrdersAsync(int count = 10)
    {
        var orders = await _orderRepo.GetRecentOrdersAsync(count);
        return orders.Select(OrderResponse.FromEntity).ToList();
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync()
    {
        return await _orderRepo.GetStatusCountsAsync();
    }

    public async Task<OrderResponse> UpdateOrderStatusAsync(
        Guid orderId, string newStatus, Guid changedByUserId, string? notes = null)
    {
        if (!Enum.TryParse<OrderStatus>(newStatus, ignoreCase: true, out var status))
        {
            _logger.LogWarning("Invalid status for order update: {Status}", newStatus.SanitizeForLog());
            throw new BusinessRuleException($"Invalid status for order update: {newStatus}");
        }

        var order = await _orderRepo.GetByIdAsync(orderId);
        if (order == null)
            throw new NotFoundException("Order", orderId);

        var previousStatus = order.Status;

        if (!IsValidStatusTransition(previousStatus, status))
        {
            throw new BusinessRuleException(
                $"Cannot transition from {previousStatus} to {status}");
        }

        order.Status = status;

        if (status == OrderStatus.Shipped)
            order.ShippedAt = DateTime.UtcNow;
        else if (status == OrderStatus.Completed)
            order.CompletedAt = DateTime.UtcNow;

        _orderRepo.Update(order);

        await _orderRepo.AddStatusHistoryAsync(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Status = status,
            Notes = notes,
            ChangedByUserId = changedByUserId,
            ChangedAt = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();

        // Send customer notification for customer-visible milestones.
        // ResendEmailService swallows send failures internally so this is safe to await directly.
        var notifyStatuses = new[]
        {
            OrderStatus.Submitted, OrderStatus.Approved,
            OrderStatus.Printing, OrderStatus.Shipped,
            OrderStatus.Completed, OrderStatus.Cancelled,
        };

        if (notifyStatuses.Contains(status))
        {
            var updated = await _orderRepo.GetOrderWithDetailsAsync(orderId);
            if (updated?.User != null)
            {
                await _emailService.SendOrderStatusUpdateAsync(
                    updated.User.Email,
                    updated.User.FirstName,
                    updated.OrderNumber,
                    status.ToString(),
                    notes);
            }
        }

        _logger.LogInformation(
            "Order {OrderNumber} status changed: {PreviousStatus} → {NewStatus} by {UserId}",
            order.OrderNumber, previousStatus, status, changedByUserId);

        var updated2 = await _orderRepo.GetOrderWithDetailsAsync(orderId);
        return OrderResponse.FromEntity(updated2!);
    }

    // --- Order history ---

    public async Task<IReadOnlyList<OrderStatusHistoryResponse>> GetOrderHistoryAsync(
        Guid orderId)
    {
        var history = await _orderRepo.GetStatusHistoryAsync(orderId);
        return history.Select(OrderStatusHistoryResponse.FromEntity).ToList();
    }

    // --- Private helpers ---

    private async Task<string> GenerateOrderNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await _orderRepo.CountAsync() + 1;
        return $"ORD-{year}-{count:D5}";
    }

    private decimal CalculateUnitPrice(
        Material material, UploadedFile file, CreateOrderItemRequest request)
    {
        decimal baseCost = 0;

        if (file.Analysis?.EstimatedWeightGrams != null)
        {
            baseCost = material.PricePerGram * file.Analysis.EstimatedWeightGrams.Value;
        }
        else
        {
            baseCost = 10.00m;
        }

        var qualityMultiplier = Enum.Parse<PrintQuality>(request.Quality, ignoreCase: true) switch
        {
            PrintQuality.Draft     => 0.8m,
            PrintQuality.Standard  => 1.0m,
            PrintQuality.High      => 1.3m,
            PrintQuality.UltraHigh => 1.6m,
            _                      => 1.0m
        };

        var infillMultiplier = (request.Infill ?? 20) / 100m;
        var infillAdjustment = 0.5m + (infillMultiplier * 0.5m);

        var supportMultiplier = request.SupportStructures ? 1.15m : 1.0m;

        var calculatedPrice = baseCost * qualityMultiplier * infillAdjustment * supportMultiplier;

        return Math.Max(calculatedPrice, 5.00m);
    }

    /// <summary>
    /// Calculates the total machine cost for an order item, snapshotted at order creation.
    /// Returns 0 if print time is unavailable so callers can treat null and 0 uniformly..
    /// </summary>
    private decimal CalculateMachineCost(UploadedFile file, int quantity)
    {
        if (file.Analysis?.EstimatedPrintTimeHours == null)
        {
            return 0m;
        }
        return Math.Round(
            file.Analysis.EstimatedPrintTimeHours.Value * _machineRatePerHour * quantity, 
            2);
    }

    private bool IsValidStatusTransition(OrderStatus current, OrderStatus next)
    {
        var allowedTransitions = new Dictionary<OrderStatus, OrderStatus[]>
        {
            [OrderStatus.Draft]          = new[] { OrderStatus.Submitted, OrderStatus.Cancelled },
            [OrderStatus.Submitted]      = new[] { OrderStatus.InReview, OrderStatus.Cancelled },
            [OrderStatus.InReview]       = new[] {
                OrderStatus.QuoteProvided, OrderStatus.Approved,
                OrderStatus.Cancelled, OrderStatus.OnHold },
            [OrderStatus.QuoteProvided]  = new[] { OrderStatus.Approved, OrderStatus.Cancelled },
            [OrderStatus.Approved]       = new[] {
                OrderStatus.InProduction, OrderStatus.Cancelled, OrderStatus.OnHold },
            [OrderStatus.InProduction]   = new[] { OrderStatus.Printing, OrderStatus.OnHold },
            [OrderStatus.Printing]       = new[] { OrderStatus.PostProcessing, OrderStatus.OnHold },
            [OrderStatus.PostProcessing] = new[] { OrderStatus.QualityCheck },
            [OrderStatus.QualityCheck]   = new[] { OrderStatus.Packaging, OrderStatus.Printing },
            [OrderStatus.Packaging]      = new[] { OrderStatus.Shipped },
            [OrderStatus.Shipped]        = new[] { OrderStatus.Delivered },
            [OrderStatus.Delivered]      = new[] { OrderStatus.Completed },
            [OrderStatus.OnHold]         = new[] {
                OrderStatus.InReview, OrderStatus.Approved,
                OrderStatus.InProduction, OrderStatus.Cancelled },
        };

        if (!allowedTransitions.TryGetValue(current, out var allowed))
            return false;

        return allowed.Contains(next);
    }

}
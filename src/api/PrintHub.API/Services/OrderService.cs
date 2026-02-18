using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Core.Common;

namespace PrintHub.API.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepo;
    private readonly IMaterialRepository _materialRepo;
    private readonly IFileRepository _fileRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository orderRepo,
        IMaterialRepository materialRepo,
        IFileRepository fileRepo,
        IUnitOfWork unitOfWork,
        ILogger<OrderService> logger)
    {
        _orderRepo = orderRepo;
        _materialRepo = materialRepo;
        _fileRepo = fileRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
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
                throw new InvalidOperationException(
                    $"Material not found: {itemRequest.MaterialId}");

            if (!material.IsActive)
                throw new InvalidOperationException(
                    $"Material is no longer available: {material.Name}");

            var file = await _fileRepo.GetFileWithAnalysisAsync(itemRequest.FileId);
            if (file == null)
                throw new InvalidOperationException(
                    $"File not found: {itemRequest.FileId}");

            var unitPrice = CalculateUnitPrice(material, file, itemRequest);

            var orderItem = new OrderItem
            {
                Id = Guid.NewGuid(),
                MaterialId = itemRequest.MaterialId,
                FileId = itemRequest.FileId,
                Quantity = itemRequest.Quantity,
                UnitPrice = unitPrice,
                TotalPrice = unitPrice * itemRequest.Quantity,
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

        // Create initial status history entry
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

        // Reload with all relationships for the response
        var created = await _orderRepo.GetOrderWithDetailsAsync(order.Id);
        return OrderResponse.FromEntity(created!);
    }

    public async Task<OrderResponse?> GetOrderByIdAsync(Guid orderId)
    {
        var order = await _orderRepo.GetOrderWithDetailsAsync(orderId);
        return order != null ? OrderResponse.FromEntity(order) : null;
    }

    public async Task<PagedResponse<OrderResponse>> GetUserOrdersAsync(
        Guid userId, int page = 1, int pageSize = 20)
    {
        var orders = await _orderRepo.GetUserOrdersAsync(userId, page, pageSize);
        return PagedResponse<OrderResponse>.FromPagedResult(
            orders, OrderResponse.FromEntity);
    }

    // --- Admin operations ---

    public async Task<PagedResponse<OrderResponse>> GetOrdersByStatusAsync(
        string status, int page = 1, int pageSize = 20)
    {
        if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var orderStatus))
        {
            _logger.LogWarning("Invalid order status requested: {Status}", status);
            return PagedResponse<OrderResponse>.FromPagedResult(
                new PagedResult<Order>(new List<Order>(), 0, page, pageSize),
                OrderResponse.FromEntity);
        }

        var orders = await _orderRepo.GetOrdersByStatusAsync(orderStatus, page, pageSize);
        return PagedResponse<OrderResponse>.FromPagedResult(
            orders, OrderResponse.FromEntity);
    }

    public async Task<IReadOnlyList<OrderResponse>> GetRecentOrdersAsync(int count = 10)
    {
        var orders = await _orderRepo.GetRecentOrdersAsync(count);
        return orders.Select(OrderResponse.FromEntity).ToList();
    }

    public async Task<OrderResponse?> UpdateOrderStatusAsync(
        Guid orderId, string newStatus, Guid changedByUserId, string? notes = null)
    {
        if (!Enum.TryParse<OrderStatus>(newStatus, ignoreCase: true, out var status))
        {
            _logger.LogWarning("Invalid status for order update: {Status}", newStatus);
            return null;
        }

        var order = await _orderRepo.GetByIdAsync(orderId);
        if (order == null)
            return null;

        var previousStatus = order.Status;

        // Validate the status transition
        if (!IsValidStatusTransition(previousStatus, status))
        {
            throw new InvalidOperationException(
                $"Cannot transition from {previousStatus} to {status}");
        }

        // Update order status
        order.Status = status;

        // Set timestamps for specific statuses
        if (status == OrderStatus.Shipped)
            order.ShippedAt = DateTime.UtcNow;
        else if (status == OrderStatus.Completed)
            order.CompletedAt = DateTime.UtcNow;

        _orderRepo.Update(order);

        // Create status history entry
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

        _logger.LogInformation(
            "Order {OrderNumber} status changed: {PreviousStatus} → {NewStatus} by {UserId}",
            order.OrderNumber, previousStatus, status, changedByUserId);

        var updated = await _orderRepo.GetOrderWithDetailsAsync(orderId);
        return OrderResponse.FromEntity(updated!);
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
        // Base cost from material and estimated weight
        decimal baseCost = 0;

        if (file.Analysis?.EstimatedWeightGrams != null)
        {
            baseCost = material.PricePerGram * file.Analysis.EstimatedWeightGrams.Value;
        }
        else
        {
            // Fallback: minimum price if no analysis available
            baseCost = 10.00m;
        }

        // Quality multiplier
        var qualityMultiplier = Enum.Parse<PrintQuality>(request.Quality, ignoreCase: true) switch
        {
            PrintQuality.Draft => 0.8m,
            PrintQuality.Standard => 1.0m,
            PrintQuality.High => 1.3m,
            PrintQuality.UltraHigh => 1.6m,
            _ => 1.0m
        };

        // Infill affects material usage
        var infillMultiplier = (request.Infill ?? 20) / 100m;
        var infillAdjustment = 0.5m + (infillMultiplier * 0.5m);
        // At 0% infill: 0.5x (hollow, still needs walls)
        // At 20% infill: 0.6x
        // At 100% infill: 1.0x (solid)

        // Support structures add ~15% material
        var supportMultiplier = request.SupportStructures ? 1.15m : 1.0m;

        var calculatedPrice = baseCost * qualityMultiplier * infillAdjustment * supportMultiplier;

        // Minimum order price
        return Math.Max(calculatedPrice, 5.00m);
    }

    private bool IsValidStatusTransition(OrderStatus current, OrderStatus next)
    {
        // Define allowed transitions
        var allowedTransitions = new Dictionary<OrderStatus, OrderStatus[]>
        {
            [OrderStatus.Draft] = new[] { OrderStatus.Submitted, OrderStatus.Cancelled },
            [OrderStatus.Submitted] = new[] { OrderStatus.InReview, OrderStatus.Cancelled },
            [OrderStatus.InReview] = new[] {
                OrderStatus.QuoteProvided, OrderStatus.Approved,
                OrderStatus.Cancelled, OrderStatus.OnHold },
            [OrderStatus.QuoteProvided] = new[] {
                OrderStatus.Approved, OrderStatus.Cancelled },
            [OrderStatus.Approved] = new[] {
                OrderStatus.InProduction, OrderStatus.Cancelled, OrderStatus.OnHold },
            [OrderStatus.InProduction] = new[] {
                OrderStatus.Printing, OrderStatus.OnHold },
            [OrderStatus.Printing] = new[] {
                OrderStatus.PostProcessing, OrderStatus.OnHold },
            [OrderStatus.PostProcessing] = new[] {
                OrderStatus.QualityCheck },
            [OrderStatus.QualityCheck] = new[] {
                OrderStatus.Packaging, OrderStatus.Printing },  // Can re-print if failed
            [OrderStatus.Packaging] = new[] {
                OrderStatus.Shipped },
            [OrderStatus.Shipped] = new[] {
                OrderStatus.Delivered },
            [OrderStatus.Delivered] = new[] {
                OrderStatus.Completed },
            [OrderStatus.OnHold] = new[] {
                OrderStatus.InReview, OrderStatus.Approved,
                OrderStatus.InProduction, OrderStatus.Cancelled },
        };

        if (!allowedTransitions.TryGetValue(current, out var allowed))
            return false;

        return allowed.Contains(next);
    }
}
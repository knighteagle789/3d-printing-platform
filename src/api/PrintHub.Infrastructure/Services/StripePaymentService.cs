using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Infrastructure.Data;
using Stripe;
using Stripe.Checkout;

namespace PrintHub.Infrastructure.Services;

public class StripePaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly IOrderRepository _orderRepo;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<StripePaymentService> _logger;

    public StripePaymentService(
        ApplicationDbContext context,
        IOrderRepository orderRepo,
        IEmailService emailService,
        IConfiguration config,
        ILogger<StripePaymentService> logger)
    {
        _context = context;
        _orderRepo = orderRepo;
        _emailService = emailService;
        _config = config;
        _logger = logger;

        StripeConfiguration.ApiKey = config["Stripe:SecretKey"];
    }

    public async Task<string> CreateCheckoutSessionAsync(Guid orderId, Guid userId)
    {
        var order = await _orderRepo.GetOrderWithDetailsAsync(orderId);
        if (order == null)
            throw new NotFoundException("Order", orderId);

        if (order.UserId != userId)
            throw new ForbiddenException("You do not have permission to pay for this order.");

        if (order.Status != OrderStatus.Submitted)
            throw new BusinessRuleException("Only submitted orders can be paid for.");

        // Check for existing pending payment
        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.OrderId == orderId
                && p.Status == PaymentStatus.Pending);

        if (existingPayment != null)
        {
            // Return existing session URL if still valid
            var existingService = new SessionService();
            var existingSession = await existingService.GetAsync(existingPayment.StripeSessionId);
            if (existingSession.Status == "open")
                return existingSession.Url;
        }

        var webAppUrl = _config["WebAppUrl"] ?? "http://localhost:3000";

        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        UnitAmount = (long)(order.TotalPrice * 100), // Stripe uses cents
                        Currency = "usd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"PrintHub Order {order.OrderNumber}",
                            Description = $"{order.Items.Count} item(s) — 3D printing services",
                        },
                    },
                    Quantity = 1,
                }
            },
            Mode = "payment",
            SuccessUrl = $"{webAppUrl}/orders/{orderId}?payment=success",
            CancelUrl = $"{webAppUrl}/orders/{orderId}?payment=cancelled",
            Metadata = new Dictionary<string, string>
            {
                { "orderId", orderId.ToString() },
                { "userId", userId.ToString() }
            }
        };

        // Add shipping cost as separate line item if present
        if (order.ShippingCost.HasValue && order.ShippingCost > 0)
        {
            options.LineItems.Add(new SessionLineItemOptions
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    UnitAmount = (long)(order.ShippingCost.Value * 100),
                    Currency = "usd",
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = "Shipping",
                    },
                },
                Quantity = 1,
            });
        }

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        // Record the pending payment
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            UserId = userId,
            StripeSessionId = session.Id,
            Amount = order.TotalPrice + (order.ShippingCost ?? 0),
            Currency = "usd",
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Stripe checkout session created for order {OrderNumber}: {SessionId}",
            order.OrderNumber, session.Id);

        return session.Url;
    }

    public async Task HandleWebhookAsync(string json, string stripeSignature)
    {
        var webhookSecret = _config["Stripe:WebhookSecret"];

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning("Invalid Stripe webhook signature: {Message}", ex.Message);
            throw new BusinessRuleException("Invalid webhook signature.");
        }

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
            var session = stripeEvent.Data.Object as Session;
            if (session == null) return;

            await HandleCheckoutSessionCompletedAsync(session);
        }
        else
        {
            _logger.LogInformation("Unhandled Stripe event type: {EventType}", stripeEvent.Type);
        }
    }

    private async Task HandleCheckoutSessionCompletedAsync(Session session)
    {
        var payment = await _context.Payments
            .Include(p => p.Order)
            .ThenInclude(o => o.User)
            .FirstOrDefaultAsync(p => p.StripeSessionId == session.Id);

        if (payment == null)
        {
            _logger.LogWarning(
                "Received webhook for unknown session: {SessionId}", session.Id);
            return;
        }

        if (payment.Status == PaymentStatus.Succeeded)
        {
            _logger.LogInformation(
                "Duplicate webhook for session {SessionId} — already processed", session.Id);
            return;
        }

        // Update payment record
        payment.Status = PaymentStatus.Succeeded;
        payment.StripePaymentIntentId = session.PaymentIntentId;
        payment.CompletedAt = DateTime.UtcNow;

        // Move order to Approved
        var order = payment.Order;
        order.Status = OrderStatus.Approved;
        order.UpdatedAt = DateTime.UtcNow;

        // Add status history entry
        await _context.OrderStatusHistory.AddAsync(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Status = OrderStatus.Approved,
            Notes = $"Payment received — Stripe session {session.Id}",
            ChangedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Payment succeeded for order {OrderNumber}, moved to Approved",
            order.OrderNumber);

        // Send confirmation email — ResendEmailService swallows send failures internally
        if (order.User != null)
        {
            await _emailService.SendOrderStatusUpdateAsync(
                order.User.Email,
                order.User.FirstName,
                order.OrderNumber,
                "Approved");
        }
    }
}
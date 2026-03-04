using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.Interfaces.Services;
using PrintHub.API.Extensions;


namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentService paymentService,
        ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    /// <summary>
    /// Create a Stripe checkout session for an order.
    /// Returns the Stripe-hosted checkout URL.
    /// </summary>
    [HttpPost("create-session/{orderId:guid}")]
    [Authorize]
    public async Task<ActionResult<CreateSessionResponse>> CreateSession(Guid orderId)
    {
        var userId = User.GetUserId();
        var url = await _paymentService.CreateCheckoutSessionAsync(orderId, userId);
        return Ok(new CreateSessionResponse(url));
    }

    /// <summary>
    /// Stripe webhook endpoint — do NOT add [Authorize].
    /// Stripe signs the request; we verify the signature inside the service.
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var stripeSignature = Request.Headers["Stripe-Signature"].ToString();

        await _paymentService.HandleWebhookAsync(json, stripeSignature);
        return Ok();
    }
}

public record CreateSessionResponse(string Url);


namespace PrintHub.Core.Interfaces.Services;

public interface IPaymentService
{
    Task<string> CreateCheckoutSessionAsync(Guid orderId, Guid userId);
    Task HandleWebhookAsync(string json, string stripeSignature);
}
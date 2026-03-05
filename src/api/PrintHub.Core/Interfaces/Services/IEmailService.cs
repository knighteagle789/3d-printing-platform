namespace PrintHub.Core.Interfaces.Services;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string firstName);
    Task SendQuoteRequestReceivedAsync(string toEmail, string firstName, string requestNumber);
    Task SendQuoteResponseProvidedAsync(string toEmail, string firstName, string requestNumber, decimal price, int estimatedDays);
    Task SendQuoteAcceptedConfirmationAsync(string toEmail, string firstName, string requestNumber);
    Task SendOrderStatusUpdateAsync(string toEmail, string firstName, string orderNumber, string status, string? notes = null);
    Task SendNewQuoteRequestAdminAsync(string requestNumber, string customerName, string? fileName);
    Task SendNewOrderAdminAsync(string orderNumber, string customerName, decimal totalPrice);
    Task SendContactFormAsync(string fromName, string fromEmail, string subject, string message);
}
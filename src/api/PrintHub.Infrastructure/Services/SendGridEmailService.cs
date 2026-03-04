using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace PrintHub.Infrastructure.Services;

public class SendGridEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SendGridEmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _adminEmail;
    private readonly bool _isEnabled;

    public SendGridEmailService(
        IConfiguration config,
        ILogger<SendGridEmailService> logger)
    {
        _config = config;
        _logger = logger;
        _fromEmail = config["Email:FromAddress"] ?? "noreply@printhub.com";
        _fromName  = config["Email:FromName"]    ?? "PrintHub";
        _adminEmail = config["Email:AdminAddress"] ?? "admin@printhub.com";
        _isEnabled = !string.IsNullOrEmpty(config["Email:SendGridApiKey"]);
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string firstName)
    {
        await SendAsync(
            toEmail,
            firstName,
            "Welcome to PrintHub!",
            $@"<h2>Welcome, {firstName}!</h2>
               <p>Your PrintHub account has been created. You can now upload 3D models, request quotes, and place orders.</p>
               <p>We're excited to help bring your designs to life.</p>
               <p>— The PrintHub Team</p>"
        );
    }

    public async Task SendQuoteRequestReceivedAsync(
        string toEmail, string firstName, string requestNumber)
    {
        await SendAsync(
            toEmail,
            firstName,
            $"Quote Request Received — {requestNumber}",
            $@"<h2>We received your quote request</h2>
               <p>Hi {firstName},</p>
               <p>Your quote request <strong>{requestNumber}</strong> has been received and is being reviewed by our team.</p>
               <p>We'll get back to you with pricing shortly.</p>
               <p>— The PrintHub Team</p>"
        );
    }

    public async Task SendQuoteResponseProvidedAsync(
        string toEmail, string firstName, string requestNumber,
        decimal price, int estimatedDays)
    {
        await SendAsync(
            toEmail,
            firstName,
            $"Your Quote is Ready — {requestNumber}",
            $@"<h2>Your quote is ready!</h2>
               <p>Hi {firstName},</p>
               <p>We've reviewed your request <strong>{requestNumber}</strong> and have provided a quote.</p>
               <ul>
                 <li><strong>Price:</strong> ${price:F2}</li>
                 <li><strong>Estimated time:</strong> {estimatedDays} business days</li>
               </ul>
               <p>Log in to your account to review and accept the quote.</p>
               <p>— The PrintHub Team</p>"
        );
    }

    public async Task SendQuoteAcceptedConfirmationAsync(
        string toEmail, string firstName, string requestNumber)
    {
        await SendAsync(
            toEmail,
            firstName,
            $"Quote Accepted — {requestNumber}",
            $@"<h2>Quote accepted!</h2>
               <p>Hi {firstName},</p>
               <p>You've accepted the quote for request <strong>{requestNumber}</strong>.</p>
               <p>You can now convert it to an order from your quotes page.</p>
               <p>— The PrintHub Team</p>"
        );
    }

    public async Task SendOrderStatusUpdateAsync(
        string toEmail, string firstName, string orderNumber,
        string status, string? notes = null)
    {
        var (subject, body) = status switch
        {
            "Submitted" => (
                $"Order Received — {orderNumber}",
                $@"<h2>We received your order!</h2>
                   <p>Hi {firstName},</p>
                   <p>Your order <strong>{orderNumber}</strong> has been submitted and is being reviewed by our team.</p>
                   <p>We'll update you as it progresses through production.</p>"
            ),
            "Printing" => (
                $"Your Order is Being Printed — {orderNumber}",
                $@"<h2>Printing has started!</h2>
                   <p>Hi {firstName},</p>
                   <p>Great news — your order <strong>{orderNumber}</strong> is now on the printer.</p>
                   <p>We'll let you know when it ships.</p>"
            ),
            "Shipped" => (
                $"Your Order Has Shipped — {orderNumber}",
                $@"<h2>Your order is on its way!</h2>
                   <p>Hi {firstName},</p>
                   <p>Your order <strong>{orderNumber}</strong> has been shipped.</p>
                   {(notes != null ? $"<p>{notes}</p>" : "")}
                   <p>— The PrintHub Team</p>"
            ),
            "Completed" => (
                $"Order Complete — {orderNumber}",
                $@"<h2>Order complete!</h2>
                   <p>Hi {firstName},</p>
                   <p>Your order <strong>{orderNumber}</strong> has been marked as complete. Thank you for choosing PrintHub!</p>
                   <p>We'd love to hear about your experience.</p>
                   <p>— The PrintHub Team</p>"
            ),
            _ => (null, null)
        };

        if (subject == null) return; // Not a customer-facing status

        await SendAsync(toEmail, firstName, subject,
            body + "<p>— The PrintHub Team</p>");
    }

    public async Task SendNewQuoteRequestAdminAsync(
        string requestNumber, string customerName, string? fileName)
    {
        await SendAsync(
            _adminEmail,
            "Admin",
            $"New Quote Request — {requestNumber}",
            $@"<h2>New quote request received</h2>
               <p><strong>Request:</strong> {requestNumber}</p>
               <p><strong>Customer:</strong> {customerName}</p>
               <p><strong>File:</strong> {fileName ?? "No file attached"}</p>
               <p>Log in to the admin panel to review and respond.</p>"
        );
    }

    public async Task SendNewOrderAdminAsync(
        string orderNumber, string customerName, decimal totalPrice)
    {
        await SendAsync(
            _adminEmail,
            "Admin",
            $"New Order — {orderNumber}",
            $@"<h2>New order placed</h2>
               <p><strong>Order:</strong> {orderNumber}</p>
               <p><strong>Customer:</strong> {customerName}</p>
               <p><strong>Total:</strong> ${totalPrice:F2}</p>
               <p>Log in to the admin panel to manage this order.</p>"
        );
    }

    private async Task SendAsync(
        string toEmail, string toName, string subject, string htmlContent)
    {
        if (!_isEnabled)
        {
            _logger.LogInformation(
                "[Email disabled] Would send '{Subject}' to {Email}", subject, toEmail);
            return;
        }

        try
        {
            var client = new SendGridClient(_config["Email:SendGridApiKey"]);
            var msg = new SendGridMessage
            {
                From = new EmailAddress(_fromEmail, _fromName),
                Subject = subject,
                HtmlContent = WrapInTemplate(subject, htmlContent),
            };
            msg.AddTo(new EmailAddress(toEmail, toName));

            var response = await client.SendEmailAsync(msg);

            if ((int)response.StatusCode >= 400)
            {
                _logger.LogError(
                    "SendGrid error {StatusCode} sending '{Subject}' to {Email}",
                    response.StatusCode, subject, toEmail);
            }
            else
            {
                _logger.LogInformation(
                    "Email sent: '{Subject}' to {Email}", subject, toEmail);
            }
        }
        catch (Exception ex)
        {
            // Never let email failures crash the main flow
            _logger.LogError(ex,
                "Failed to send email '{Subject}' to {Email}", subject, toEmail);
        }
    }

    private static string WrapInTemplate(string title, string content) => $@"
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                   background: #f4f4f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background: white;
                         border-radius: 8px; overflow: hidden; }}
            .header {{ background: #18181b; color: white; padding: 24px 32px; }}
            .header h1 {{ margin: 0; font-size: 20px; }}
            .body {{ padding: 32px; color: #18181b; line-height: 1.6; }}
            .footer {{ background: #f4f4f5; padding: 16px 32px;
                      color: #71717a; font-size: 12px; text-align: center; }}
          </style>
        </head>
        <body>
          <div class='container'>
            <div class='header'><h1>Print<span style='color:#a1a1aa'>Hub</span></h1></div>
            <div class='body'>{content}</div>
            <div class='footer'>© {DateTime.UtcNow.Year} PrintHub. All rights reserved.</div>
          </div>
        </body>
        </html>";
}
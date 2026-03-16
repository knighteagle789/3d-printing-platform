using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;
using Resend;

namespace PrintHub.Infrastructure.Services;

public class ResendEmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly ILogger<ResendEmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _adminEmail;
    private readonly bool _isEnabled;

    public ResendEmailService(
        IResend resend,
        IConfiguration config,
        ILogger<ResendEmailService> logger)
    {
        _resend = resend;
        _logger = logger;
        _fromEmail  = config["Email:FromAddress"]  ?? "noreply@nocomakeleb.com";
        _fromName   = config["Email:FromName"]     ?? "NoCo Make Lab";
        _adminEmail = config["Email:AdminAddress"] ?? "admin@nocomakeleb.com";
        _isEnabled  = !string.IsNullOrEmpty(config["Email:ResendApiKey"]);
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string firstName)
    {
        await SendAsync(
            toEmail, firstName,
            "Welcome to NoCo Make Lab!",
            $@"<h2>Welcome, {firstName}!</h2>
               <p>Your NoCo Make Lab account has been created. You can now upload 3D models, request quotes, and place orders.</p>
               <p>We're excited to help bring your designs to life.</p>
               <p>— The NoCo Make Lab Team</p>"
        );
    }

    public async Task SendQuoteRequestReceivedAsync(
        string toEmail, string firstName, string requestNumber)
    {
        await SendAsync(
            toEmail, firstName,
            $"Quote Request Received — {requestNumber}",
            $@"<h2>We received your quote request</h2>
               <p>Hi {firstName},</p>
               <p>Your quote request <strong>{requestNumber}</strong> has been received and is being reviewed.</p>
               <p>We'll get back to you with pricing shortly.</p>
               <p>— The NoCo Make Lab Team</p>"
        );
    }

    public async Task SendQuoteResponseProvidedAsync(
        string toEmail, string firstName, string requestNumber,
        decimal price, int estimatedDays)
    {
        await SendAsync(
            toEmail, firstName,
            $"Your Quote is Ready — {requestNumber}",
            $@"<h2>Your quote is ready!</h2>
               <p>Hi {firstName},</p>
               <p>We've reviewed your request <strong>{requestNumber}</strong> and have provided a quote.</p>
               <ul>
                 <li><strong>Price:</strong> ${price:F2}</li>
                 <li><strong>Estimated time:</strong> {estimatedDays} business days</li>
               </ul>
               <p>Log in to your account to review and accept the quote.</p>
               <p>— The NoCo Make Lab Team</p>"
        );
    }

    public async Task SendQuoteAcceptedConfirmationAsync(
        string toEmail, string firstName, string requestNumber)
    {
        await SendAsync(
            toEmail, firstName,
            $"Quote Accepted — {requestNumber}",
            $@"<h2>Quote accepted!</h2>
               <p>Hi {firstName},</p>
               <p>You've accepted the quote for request <strong>{requestNumber}</strong>.</p>
               <p>You can now convert it to an order from your quotes page.</p>
               <p>— The NoCo Make Lab Team</p>"
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
                   <p>Your order <strong>{orderNumber}</strong> has been submitted and is being reviewed.</p>
                   <p>We'll update you as it progresses through production.</p>"
            ),
            "Printing" => (
                $"Your Order is Being Printed — {orderNumber}",
                $@"<h2>Printing has started!</h2>
                   <p>Hi {firstName},</p>
                   <p>Great news — your order <strong>{orderNumber}</strong> is now on the printer.</p>
                   <p>We'll let you know when it ships.</p>"
            ),
            "Approved" => (
                $"Payment Confirmed — {orderNumber}",
                $@"<h2>Payment confirmed!</h2>
                   <p>Hi {firstName},</p>
                   <p>We've received your payment for order <strong>{orderNumber}</strong>.
                   Your order has been approved and will enter production shortly.</p>"
            ),
            "Shipped" => (
                $"Your Order Has Shipped — {orderNumber}",
                $@"<h2>Your order is on its way!</h2>
                   <p>Hi {firstName},</p>
                   <p>Your order <strong>{orderNumber}</strong> has been shipped.</p>
                   {(notes != null ? $"<p>{notes}</p>" : "")}
                   <p>— The NoCo Make Lab Team</p>"
            ),
            "Completed" => (
                $"Order Complete — {orderNumber}",
                $@"<h2>Order complete!</h2>
                   <p>Hi {firstName},</p>
                   <p>Your order <strong>{orderNumber}</strong> has been marked as complete. Thank you for choosing NoCo Make Lab!</p>
                   <p>We'd love to hear about your experience.</p>
                   <p>— The NoCo Make Lab Team</p>"
            ),
            _ => (null, null)
        };

        if (subject == null) return;

        await SendAsync(toEmail, firstName, subject,
            body + "<p>— The NoCo Make Lab Team</p>");
    }

    public async Task SendNewQuoteRequestAdminAsync(
        string requestNumber, string customerName, string? fileName)
    {
        await SendAsync(
            _adminEmail, "Admin",
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
            _adminEmail, "Admin",
            $"New Order — {orderNumber}",
            $@"<h2>New order placed</h2>
               <p><strong>Order:</strong> {orderNumber}</p>
               <p><strong>Customer:</strong> {customerName}</p>
               <p><strong>Total:</strong> ${totalPrice:F2}</p>
               <p>Log in to the admin panel to manage this order.</p>"
        );
    }

    public async Task SendContactFormAsync(
        string fromName, string fromEmail, string subject, string message)
    {
        await SendAsync(
            _adminEmail, "Admin",
            $"Contact Form: {subject}",
            $@"<h2>New contact form submission</h2>
               <p><strong>Name:</strong> {fromName}</p>
               <p><strong>Email:</strong> {fromEmail}</p>
               <p><strong>Subject:</strong> {subject}</p>
               <p><strong>Message:</strong></p>
               <p>{message.Replace("\n", "<br>")}</p>"
        );

        await SendAsync(
            fromEmail, fromName,
            "We received your message — NoCo Make Lab",
            $@"<h2>Thanks for reaching out, {fromName}!</h2>
               <p>We've received your message and will get back to you within 1-2 business days.</p>
               <p><strong>Your message:</strong></p>
               <p>{message.Replace("\n", "<br>")}</p>
               <p>— The NoCo Make Lab Team</p>"
        );
    }

    public async Task SendPasswordResetEmailAsync(
        string toEmail, string firstName, string resetLink)
    {
        await SendAsync(
            toEmail, firstName,
            "Reset your NoCo Make Lab password",
            $@"<h2>Password reset request</h2>
               <p>Hi {firstName},</p>
               <p>We received a request to reset the password for your NoCo Make Lab account.</p>
               <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
               <p style='margin: 32px 0;'>
                 <a href='{resetLink}' style='background:#0d9488;color:white;padding:12px 24px;
                    text-decoration:none;font-weight:600;display:inline-block;'>
                   Reset Password
                 </a>
               </p>
               <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
               <p>— NoCo Make Lab</p>"
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

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
            var message = new EmailMessage
            {
                From    = $"{_fromName} <{_fromEmail}>",
                Subject = subject,
                HtmlBody = WrapInTemplate(subject, htmlContent),
            };
            message.To.Add(toEmail);

            await _resend.EmailSendAsync(message);

            _logger.LogInformation(
                "Email sent: '{Subject}' to {Email}", subject, toEmail);
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
            <div class='header'><h1>NoCo Make Lab</h1></div>
            <div class='body'>{content}</div>
            <div class='footer'>© {DateTime.UtcNow.Year} NoCo Make Lab. All rights reserved.</div>
          </div>
        </body>
        </html>";
}
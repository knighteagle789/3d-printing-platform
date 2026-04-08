using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Contact;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IEmailService emailService, ILogger<ContactController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Submit(ContactRequest request)
    {
        await _emailService.SendContactFormAsync(
            request.Name, request.Email, request.Subject, request.Message);

        _logger.LogInformation(
            "Contact form submitted by {Name} ({Email})",
            request.Name.SanitizeForLog(), request.Email.SanitizeForLog());

        return Ok(new { message = "Message sent successfully." });
    }
}
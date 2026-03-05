namespace PrintHub.Core.DTOs.Contact;

public record ContactRequest(
    string Name,
    string Email,
    string Subject,
    string Message
);
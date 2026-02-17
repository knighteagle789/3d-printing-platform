using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Data required for new user registration.
/// Password will be hashed in the service layer — never stored as-is.
/// </summary>
public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? CompanyName)
{
    /// <summary>
    /// Maps this request to a new User entity.
    /// Note: PasswordHash is NOT set here — the service layer handles hashing.
    /// </summary>
    public User ToEntity() => new()
    {
        Id = Guid.NewGuid(),
        Email = Email.ToLower().Trim(),
        FirstName = FirstName.Trim(),
        LastName = LastName.Trim(),
        PhoneNumber = PhoneNumber?.Trim(),
        CompanyName = CompanyName?.Trim(),
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
}
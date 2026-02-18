namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Data for updating user profile.
/// All fields nullable — only provided fields get updated.
/// </summary>
public record UpdateUserRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? CompanyName);
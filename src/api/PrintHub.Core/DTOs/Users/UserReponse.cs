using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// User data returned by the API.
/// Deliberately excludes sensitive fields like PasswordHash.
/// </summary>
public record UserResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? CompanyName,
    bool IsActive,
    IReadOnlyList<string> Roles,
    DateTime CreatedAt)
{
    /// <summary>
    /// Maps a User entity to a UserResponse DTO.
    /// Requires UserRoles to be eagerly loaded.
    /// </summary>
    public static UserResponse FromEntity(User user) => new(
        Id: user.Id,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName,
        PhoneNumber: user.PhoneNumber,
        CompanyName: user.CompanyName,
        IsActive: user.IsActive,
        Roles: user.UserRoles?.Select(r => r.Role.ToString()).ToList()
            ?? new List<string>(),
        CreatedAt: user.CreatedAt
    );
}
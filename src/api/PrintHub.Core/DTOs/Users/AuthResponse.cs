namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Returned after successful login or registration.
/// Contains the JWT token and user info.
/// </summary>
public record AuthResponse(
    string Token,
    DateTime ExpiresAt,
    UserResponse User);
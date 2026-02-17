namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Data required for user login.
/// No mapping method needed — the auth service handles this directly.
/// </summary>
public record LoginRequest(
    string Email,
    string Password);
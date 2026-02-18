namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Request to refresh an expired JWT token.
/// </summary>
public record RefreshTokenRequest(string Token);
using PrintHub.Core.DTOs.Users;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for authentication and user management.
/// Handles registration, login, token generation, and user queries.
/// </summary>
public interface IAuthService
{
    // --- Authentication ---
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string token);

    // --- User management ---
    Task<UserResponse> GetUserByIdAsync(Guid id);
    Task<UserResponse> GetUserByEmailAsync(string email);
    Task<UserResponse> UpdateUserAsync(Guid id, UpdateUserRequest request);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
    Task DeactivateUserAsync(Guid id);

    // --- Password reset ---
    Task ForgotPasswordAsync(string email, string resetBaseUrl);
    Task ResetPasswordAsync(string token, string newPassword);
}
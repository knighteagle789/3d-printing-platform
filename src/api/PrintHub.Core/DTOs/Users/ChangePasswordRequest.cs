namespace PrintHub.Core.DTOs.Users;

/// <summary>
/// Data for changing a user's password.
/// Requires current password for verification.
/// </summary>
public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);
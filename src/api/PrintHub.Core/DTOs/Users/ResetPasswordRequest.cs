namespace PrintHub.Core.DTOs.Users;

public record ResetPasswordRequest(string Token, string NewPassword);
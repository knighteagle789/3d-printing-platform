using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Interfaces.Services;
using PrintHub.API.Extensions;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // ─── Public endpoints ─────────────────────────────────────────────────

    /// <summary>
    /// Register a new user account.
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var response = await _authService.RegisterAsync(request);
        return Ok(response);
    }

    /// <summary>
    /// Login with email and password.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        if (response == null)
            return Unauthorized(new { message = "Invalid email or password." });
        return Ok(response);
    }

    /// <summary>
    /// Refresh an expired JWT token.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> RefreshToken(
        [FromBody] RefreshTokenRequest request)
    {
        var response = await _authService.RefreshTokenAsync(request.Token);
        if (response == null)
            return Unauthorized(new { message = "Invalid or expired token." });
        return Ok(response);
    }

    // ─── Authenticated endpoints ──────────────────────────────────────────

    /// <summary>
    /// Get the current user's profile.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> GetCurrentUser()
    {
        var userId = User.GetUserId();
        var user = await _authService.GetUserByIdAsync(userId);
        return Ok(user);
    }

    /// <summary>
    /// Update the current user's profile.
    /// </summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> UpdateProfile(
        UpdateUserRequest request)
    {
        var userId = User.GetUserId();
        var user = await _authService.UpdateUserAsync(userId, request);
        return Ok(user);
    }

    /// <summary>
    /// Change the current user's password.
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        await _authService.ChangePasswordAsync(userId, request);
        return Ok(new { message = "Password changed successfully." });
    }

    // ─── Private helpers ──────────────────────────────────────────────────

}
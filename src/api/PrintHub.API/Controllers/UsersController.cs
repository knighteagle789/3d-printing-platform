using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userService;

    public UsersController(IUserManagementService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Get all users with pagination. Requires Admin role.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedUsersResponse>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _userService.GetAllUsersAsync(page, pageSize);
        return Ok(new PagedUsersResponse(
            result.Items,
            result.TotalCount,
            result.Page,
            result.PageSize));
    }

    /// <summary>
    /// Get a specific user by ID. Requires Admin role.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> GetUser(Guid id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        return Ok(user);
    }

    /// <summary>
    /// Update a user's roles. Requires Admin role.
    /// </summary>
    [HttpPut("{id:guid}/roles")]
    public async Task<ActionResult<UserResponse>> UpdateRoles(
        Guid id, [FromBody] UpdateUserRolesRequest request)
    {
        var user = await _userService.UpdateUserRolesAsync(id, request.Roles);
        return Ok(user);
    }

    /// <summary>
    /// Activate or deactivate a user. Requires Admin role.
    /// </summary>
    [HttpPatch("{id:guid}/active")]
    public async Task<ActionResult<UserResponse>> SetActive(
        Guid id, [FromBody] SetUserActiveRequest request)
    {
        var user = await _userService.SetUserActiveAsync(id, request.IsActive);
        return Ok(user);
    }
}
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class UserManagementService : IUserManagementService
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ILogger<UserManagementService> logger)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<PagedResult<UserResponse>> GetAllUsersAsync(int page = 1, int pageSize = 20)
    {
        var result = await _userRepo.GetAllUsersAsync(page, pageSize);
        var mapped = result.Items.Select(UserResponse.FromEntity).ToList();
        return new PagedResult<UserResponse>(mapped, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<UserResponse> GetUserByIdAsync(Guid id)
    {
        var user = await _userRepo.GetWithRolesAsync(id);
        if (user == null)
            throw new NotFoundException("User", id);
        return UserResponse.FromEntity(user);
    }

    public async Task<UserResponse> UpdateUserRolesAsync(Guid id, List<string> roles)
    {
        var user = await _userRepo.GetWithRolesAsync(id);
        if (user == null)
            throw new NotFoundException("User", id);

        // Delete existing roles and save immediately to clear the change tracker
        await _userRepo.DeleteUserRolesAsync(id);
        await _unitOfWork.SaveChangesAsync();

        // Add new roles as fresh inserts
        foreach (var role in roles.Distinct())
        {
            if (Enum.TryParse<Role>(role, ignoreCase: true, out var parsedRole))
            {
                await _userRepo.AddUserRoleAsync(new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = id,
                    Role = parsedRole,
                    AssignedAt = DateTime.UtcNow,
                });
            }
        }

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Updated roles for user {UserId}: {Roles}",
            id, string.Join(", ", roles));

        var updated = await _userRepo.GetWithRolesAsync(id);
        return UserResponse.FromEntity(updated!);
    }

    public async Task<UserResponse> SetUserActiveAsync(Guid id, bool isActive)
    {
        var user = await _userRepo.GetWithRolesAsync(id);
        if (user == null)
            throw new NotFoundException("User", id);

        user.IsActive = isActive;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Set user {UserId} active={IsActive}", id, isActive);

        return UserResponse.FromEntity(user);
    }
}
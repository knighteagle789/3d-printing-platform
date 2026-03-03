using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces.Services;

public interface IUserManagementService
{
    Task<PagedResult<UserResponse>> GetAllUsersAsync(int page = 1, int pageSize = 20);
    Task<UserResponse> GetUserByIdAsync(Guid id);
    Task<UserResponse> UpdateUserRolesAsync(Guid id, List<string> roles);
    Task<UserResponse> SetUserActiveAsync(Guid id, bool isActive);
}
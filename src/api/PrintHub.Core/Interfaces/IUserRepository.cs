using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for User entities.
/// Adds authentication-related queries and admin user management
/// on top of the generic CRUD operations.
/// </summary>
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);

    Task<bool> EmailExistsAsync(string email);

    Task<IReadOnlyList<User>> GetByRoleAsync(Role role);

    Task<User?> GetWithRolesAsync(Guid userId);

    Task<PagedResult<User>> GetActiveUsersAsync(int page = 1, int pageSize = 20);
}

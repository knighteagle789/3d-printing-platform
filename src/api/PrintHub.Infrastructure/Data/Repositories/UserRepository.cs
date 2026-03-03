using Microsoft.EntityFrameworkCore;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Infrastructure.Data.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(ApplicationDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _dbSet
            .AnyAsync(u => u.Email.ToLower() == email.ToLower());
    }

    public async Task<IReadOnlyList<User>> GetByRoleAsync(Role role)
    {
        return await _dbSet
            .Include(u => u.UserRoles)
            .Where(u => u.UserRoles.Any(r => r.Role == role))
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync();
    }

    public async Task<User?> GetWithRolesAsync(Guid userId)
    {
        return await _dbSet
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<PagedResult<User>> GetActiveUsersAsync(int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Where(u => u.IsActive);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<User>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<User>> GetAllUsersAsync(int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbSet.Include(u => u.UserRoles);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<User>(items, totalCount, page, pageSize);
    }

    public async Task DeleteUserRolesAsync(Guid userId)
    {
        var roles = await _context.Set<UserRole>()
            .Where(r => r.UserId == userId)
            .ToListAsync();

        _context.Set<UserRole>().RemoveRange(roles);
    }

    public async Task AddUserRoleAsync(UserRole role)
    {
        await _context.Set<UserRole>().AddAsync(role);
    }
}
using System.Linq.Expressions;
using PrintHub.Core.Common;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Generic repository interface providing standard CRUD operations.
/// All entity-specific repositories extend this interface.
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);

    Task<IReadOnlyList<T>> GetAllAsync();

    Task<PagedResult<T>> GetPagedAsync(int page = 1, int pageSize = 20);

    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate);

    Task<T> AddAsync(T entity);

    void Update(T entity);

    void Delete(T entity);

    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);

    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
}
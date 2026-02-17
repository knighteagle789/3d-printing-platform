namespace PrintHub.Core.Interfaces;

/// <summary>
/// Coordinates saving changes across multiple repositories
/// in a single database transaction.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<IDbTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Abstraction over database transactions so services don't depend on EF Core directly.
/// </summary>
public interface IDbTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync(CancellationToken cancellationToken = default);
}
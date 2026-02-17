using PrintHub.Core.Common;

namespace PrintHub.Core.DTOs.Common;

/// <summary>
/// Generic paginated response wrapper for API endpoints.
/// Transforms the internal PagedResult into an API-friendly shape.
/// </summary>
public record PagedResponse<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
    public bool HasPreviousPage { get; init; }
    public bool HasNextPage { get; init; }

    /// <summary>
    /// Create from a PagedResult where items are already mapped to DTOs.
    /// </summary>
    public static PagedResponse<T> FromPagedResult(
        PagedResult<T> pagedResult)
    {
        return new PagedResponse<T>
        {
            Items = pagedResult.Items,
            Page = pagedResult.Page,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
            TotalPages = pagedResult.TotalPages,
            HasPreviousPage = pagedResult.HasPreviousPage,
            HasNextPage = pagedResult.HasNextPage
        };
    }

    /// <summary>
    /// Create from a PagedResult of entities, mapping each to a DTO.
    /// This is the most common usage — repository returns entities,
    /// we transform them to DTOs for the API response.
    /// </summary>
    public static PagedResponse<T> FromPagedResult<TEntity>(
        PagedResult<TEntity> pagedResult,
        Func<TEntity, T> mapper)
    {
        return new PagedResponse<T>
        {
            Items = pagedResult.Items.Select(mapper).ToList(),
            Page = pagedResult.Page,
            PageSize = pagedResult.PageSize,
            TotalCount = pagedResult.TotalCount,
            TotalPages = pagedResult.TotalPages,
            HasPreviousPage = pagedResult.HasPreviousPage,
            HasNextPage = pagedResult.HasNextPage
        };
    }
}
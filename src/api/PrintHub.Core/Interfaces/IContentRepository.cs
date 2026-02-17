using PrintHub.Core.Common;
using PrintHub.Core.Entities;

namespace PrintHub.Core.Interfaces;

/// <summary>
/// Repository for PortfolioItem and BlogPost entities.
/// Supports the public-facing content pages (portfolio gallery, blog).
/// </summary>
public interface IContentRepository : IRepository<PortfolioItem>
{
    Task<IReadOnlyList<PortfolioItem>> GetFeaturedPortfolioItemsAsync(int count = 6);

    Task<PagedResult<PortfolioItem>> GetPortfolioItemsAsync(int page = 1, int pageSize = 12);

    Task<IReadOnlyList<PortfolioItem>> GetPortfolioByTagAsync(string tag);

    Task<PagedResult<BlogPost>> GetPublishedBlogPostsAsync(int page = 1, int pageSize = 10);

    Task<BlogPost?> GetBlogPostBySlugAsync(string slug);

    Task<BlogPost?> GetBlogPostByIdAsync(Guid id);

    Task<BlogPost> AddBlogPostAsync(BlogPost blogPost);

    void UpdateBlogPost(BlogPost blogPost);

    Task<IReadOnlyList<string>> GetAllTagsAsync();
}
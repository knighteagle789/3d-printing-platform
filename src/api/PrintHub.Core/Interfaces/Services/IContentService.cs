using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Content;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Service for portfolio and blog content management.
/// Supports both public viewing and admin content creation.
/// </summary>
public interface IContentService
{
    // --- Portfolio ---
    Task<IReadOnlyList<PortfolioItemResponse>> GetFeaturedPortfolioItemsAsync(int count = 6);
    Task<PagedResponse<PortfolioItemResponse>> GetPortfolioItemsAsync(
        int page = 1, int pageSize = 12);
    Task<IReadOnlyList<PortfolioItemResponse>> GetPortfolioByTagAsync(string tag);
    Task<PortfolioItemResponse?> GetPortfolioItemByIdAsync(Guid id);

    // --- Blog ---
    Task<PagedResponse<BlogPostSummaryResponse>> GetPublishedBlogPostsAsync(
        int page = 1, int pageSize = 10);
    Task<BlogPostResponse?> GetBlogPostBySlugAsync(string slug);
    Task<BlogPostResponse?> GetBlogPostByIdAsync(Guid id);
    Task<BlogPostResponse> CreateBlogPostAsync(Guid authorId, CreateBlogPostRequest request);

    // --- Tags ---
    Task<IReadOnlyList<string>> GetAllTagsAsync();
}
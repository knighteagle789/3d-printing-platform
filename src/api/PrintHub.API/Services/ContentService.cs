using System.Text.RegularExpressions;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public partial class ContentService : IContentService
{
    private readonly IContentRepository _contentRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ContentService> _logger;

    public ContentService(
        IContentRepository contentRepo,
        IUnitOfWork unitOfWork,
        ILogger<ContentService> logger)
    {
        _contentRepo = contentRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // --- Portfolio ---

    public async Task<IReadOnlyList<PortfolioItemResponse>> GetFeaturedPortfolioItemsAsync(
        int count = 6)
    {
        var items = await _contentRepo.GetFeaturedPortfolioItemsAsync(count);
        return items.Select(PortfolioItemResponse.FromEntity).ToList();
    }

    public async Task<PagedResponse<PortfolioItemResponse>> GetPortfolioItemsAsync(
        int page = 1, int pageSize = 12)
    {
        var items = await _contentRepo.GetPortfolioItemsAsync(page, pageSize);
        return PagedResponse<PortfolioItemResponse>.FromPagedResult(
            items, PortfolioItemResponse.FromEntity);
    }

    public async Task<IReadOnlyList<PortfolioItemResponse>> GetPortfolioByTagAsync(string tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
            return new List<PortfolioItemResponse>();

        var items = await _contentRepo.GetPortfolioByTagAsync(tag.Trim().ToLower());
        return items.Select(PortfolioItemResponse.FromEntity).ToList();
    }

    public async Task<PortfolioItemResponse?> GetPortfolioItemByIdAsync(Guid id)
    {
        var item = await _contentRepo.GetByIdAsync(id);
        return item != null ? PortfolioItemResponse.FromEntity(item) : null;
    }

    // --- Blog ---

    public async Task<PagedResponse<BlogPostSummaryResponse>> GetPublishedBlogPostsAsync(
        int page = 1, int pageSize = 10)
    {
        var posts = await _contentRepo.GetPublishedBlogPostsAsync(page, pageSize);
        return PagedResponse<BlogPostSummaryResponse>.FromPagedResult(
            posts, BlogPostSummaryResponse.FromEntity);
    }

    public async Task<BlogPostResponse?> GetBlogPostBySlugAsync(string slug)
    {
        var post = await _contentRepo.GetBlogPostBySlugAsync(slug);
        return post != null ? BlogPostResponse.FromEntity(post) : null;
    }

    public async Task<BlogPostResponse?> GetBlogPostByIdAsync(Guid id)
    {
        var post = await _contentRepo.GetBlogPostByIdAsync(id);
        return post != null ? BlogPostResponse.FromEntity(post) : null;
    }

    public async Task<BlogPostResponse> CreateBlogPostAsync(
        Guid authorId, CreateBlogPostRequest request)
    {
        var post = new BlogPost
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = request.Title.Trim(),
            Slug = GenerateSlug(request.Title),
            Summary = request.Summary.Trim(),
            Content = request.Content,
            FeaturedImageUrl = request.FeaturedImageUrl,
            Category = Enum.Parse<BlogCategory>(request.Category, ignoreCase: true),
            Tags = request.Tags,
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished
                ? request.PublishedAt ?? DateTime.UtcNow
                : request.PublishedAt,
            CreatedAt = DateTime.UtcNow
        };

        await _contentRepo.AddBlogPostAsync(post);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Blog post created: {Slug} by author {AuthorId}",
            post.Slug, authorId);

        var created = await _contentRepo.GetBlogPostByIdAsync(post.Id);
        return BlogPostResponse.FromEntity(created!);
    }

    // --- Tags ---

    public async Task<IReadOnlyList<string>> GetAllTagsAsync()
    {
        return await _contentRepo.GetAllTagsAsync();
    }

    // --- Private helpers ---

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLower().Trim();

        // Replace spaces and special chars with hyphens
        slug = SlugInvalidChars().Replace(slug, "-");

        // Remove consecutive hyphens
        slug = SlugConsecutiveHyphens().Replace(slug, "-");

        // Trim hyphens from ends
        slug = slug.Trim('-');

        // Append a short unique suffix to prevent duplicates
        var suffix = Guid.NewGuid().ToString("N")[..6];

        return $"{slug}-{suffix}";
    }

    [GeneratedRegex(@"[^a-z0-9\-]")]
    private static partial Regex SlugInvalidChars();

    [GeneratedRegex(@"-{2,}")]
    private static partial Regex SlugConsecutiveHyphens();

    public async Task<PortfolioItemResponse?> CreatePortfolioItemAsync(CreatePortfolioItemRequest request)
    {
        var entity = request.ToEntity();

        await _contentRepo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        // Reload to get any navigation properties
        var saved = await _contentRepo.GetByIdAsync(entity.Id);
        if (saved == null) return null;

        _logger.LogInformation("Created portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title);
        return PortfolioItemResponse.FromEntity(saved);
    }

    public async Task<PortfolioItemResponse?> UpdatePortfolioItemAsync(Guid id, UpdatePortfolioItemRequest request)
    {
        var entity = await _contentRepo.GetByIdAsync(id);
        if (entity == null) return null;

        request.ApplyToEntity(entity);

        _contentRepo.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Updated portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title);
        return PortfolioItemResponse.FromEntity(entity);
    }

    public async Task<bool> DeletePortfolioItemAsync(Guid id)
    {
        var entity = await _contentRepo.GetByIdAsync(id);
        if (entity == null) return false;

        entity.IsPublished = false; // Soft delete — unpublish rather than remove
        entity.UpdatedAt = DateTime.UtcNow;

        _contentRepo.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Unpublished portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title);
        return true;
    }
}
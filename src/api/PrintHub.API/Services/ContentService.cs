using System.Text.RegularExpressions;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Core.Common;

namespace PrintHub.API.Services;

public partial class ContentService : IContentService
{
    private readonly IContentRepository _contentRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<ContentService> _logger;

    private static readonly TimeSpan PortfolioSasTtl = TimeSpan.FromHours(1);

    public ContentService(
        IContentRepository contentRepo,
        IUnitOfWork unitOfWork,
        IFileStorageService fileStorageService,
        ILogger<ContentService> logger)
    {
        _contentRepo = contentRepo;
        _unitOfWork = unitOfWork;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    // ── Portfolio ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PortfolioItemResponse>> GetFeaturedPortfolioItemsAsync(
        int count = 6)
    {
        var items = await _contentRepo.GetFeaturedPortfolioItemsAsync(count);
        var responses = new List<PortfolioItemResponse>();
        foreach (var item in items)
            responses.Add(await ToPortfolioResponseAsync(item));
        return responses;
    }

    public async Task<PagedResponse<PortfolioItemResponse>> GetPortfolioItemsAsync(
        int page = 1, int pageSize = 12)
    {
        var pagedResult = await _contentRepo.GetPortfolioItemsAsync(page, pageSize);

        // Pre-resolve SAS URLs for all items before sync mapping
        var sasCache = new Dictionary<Guid, (string? modelUrl, string? timelapseUrl)>();
        foreach (var item in pagedResult.Items)
            sasCache[item.Id] = await ResolvePortfolioSasUrlsAsync(item);

        return PagedResponse<PortfolioItemResponse>.FromPagedResult(
            pagedResult,
            item =>
            {
                var (modelUrl, timelapseUrl) = sasCache.GetValueOrDefault(item.Id);
                return PortfolioItemResponse.FromEntity(item) with
                {
                    ModelFileUrl = modelUrl,
                    TimelapseVideoUrl = timelapseUrl,
                };
            });
    }

    public async Task<IReadOnlyList<PortfolioItemResponse>> GetPortfolioByTagAsync(string tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
            return new List<PortfolioItemResponse>();

        var items = await _contentRepo.GetPortfolioByTagAsync(tag.Trim().ToLower());
        var responses = new List<PortfolioItemResponse>();
        foreach (var item in items)
            responses.Add(await ToPortfolioResponseAsync(item));
        return responses;
    }

    public async Task<PortfolioItemResponse> GetPortfolioItemByIdAsync(Guid id)
    {
        var item = await _contentRepo.GetByIdAsync(id);
        if (item == null)
            throw new NotFoundException("Portfolio item", id);
        return await ToPortfolioResponseAsync(item);
    }

    // ── Blog ──────────────────────────────────────────────────────────────────

    public async Task<PagedResponse<BlogPostSummaryResponse>> GetPublishedBlogPostsAsync(
        int page = 1, int pageSize = 10)
    {
        var posts = await _contentRepo.GetPublishedBlogPostsAsync(page, pageSize);
        return PagedResponse<BlogPostSummaryResponse>.FromPagedResult(
            posts, BlogPostSummaryResponse.FromEntity);
    }

    public async Task<BlogPostResponse> GetBlogPostBySlugAsync(string slug)
    {
        var post = await _contentRepo.GetBlogPostBySlugAsync(slug);
        if (post == null)
            throw new NotFoundException($"Blog post with slug '{slug}' was not found.");
        return BlogPostResponse.FromEntity(post);
    }

    public async Task<BlogPostResponse> GetBlogPostByIdAsync(Guid id)
    {
        var post = await _contentRepo.GetBlogPostByIdAsync(id);
        if (post == null)
            throw new NotFoundException("Blog post", id);
        return BlogPostResponse.FromEntity(post);
    }

    public async Task<PagedResponse<BlogPostSummaryResponse>> GetAllBlogPostsAsync(
        int page = 1, int pageSize = 50)
    {
        var result = await _contentRepo.GetAllBlogPostsAsync(page, pageSize);
        var mapped = new PagedResult<BlogPostSummaryResponse>(
            result.Items.Select(BlogPostSummaryResponse.FromEntity).ToList(),
            result.TotalCount,
            page,
            pageSize);
        return PagedResponse<BlogPostSummaryResponse>.FromPagedResult(mapped);
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
            post.Slug.SanitizeForLog(), authorId);

        var created = await _contentRepo.GetBlogPostByIdAsync(post.Id);
        return BlogPostResponse.FromEntity(created!);
    }

    public async Task<BlogPostResponse> UpdateBlogPostAsync(Guid id, UpdateBlogPostRequest request)
    {
        var post = await _contentRepo.GetBlogPostByIdAsync(id);
        if (post == null)
            throw new NotFoundException("Blog post", id);

        if (request.Title != null)
        {
            post.Title = request.Title.Trim();
            post.Slug = GenerateSlug(request.Title);
        }
        if (request.Summary != null) post.Summary = request.Summary.Trim();
        if (request.Content != null) post.Content = request.Content;
        if (request.FeaturedImageUrl != null) post.FeaturedImageUrl = request.FeaturedImageUrl;
        if (request.Category != null)
            post.Category = Enum.Parse<BlogCategory>(request.Category, ignoreCase: true);
        if (request.Tags != null) post.Tags = request.Tags;
        if (request.IsPublished.HasValue)
        {
            post.IsPublished = request.IsPublished.Value;
            if (request.IsPublished.Value && post.PublishedAt == null)
                post.PublishedAt = DateTime.UtcNow;
        }
        if (request.PublishedAt.HasValue) post.PublishedAt = request.PublishedAt.Value;
        post.UpdatedAt = DateTime.UtcNow;

        _contentRepo.UpdateBlogPost(post);
        await _unitOfWork.SaveChangesAsync();

        var updated = await _contentRepo.GetBlogPostByIdAsync(post.Id);
        return BlogPostResponse.FromEntity(updated!);
    }

    public async Task DeleteBlogPostAsync(Guid id)
    {
        var post = await _contentRepo.GetBlogPostByIdAsync(id);
        if (post == null)
            throw new NotFoundException("Blog post", id);

        _contentRepo.DeleteBlogPost(post);
        await _unitOfWork.SaveChangesAsync();
        _logger.LogInformation("Blog post deleted: {Id}", id);
    }

    // ── Tags ──────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<string>> GetAllTagsAsync()
    {
        return await _contentRepo.GetAllTagsAsync();
    }

    // ── Portfolio CRUD ────────────────────────────────────────────────────────

    public async Task<PortfolioItemResponse> CreatePortfolioItemAsync(CreatePortfolioItemRequest request)
    {
        var entity = request.ToEntity();

        await _contentRepo.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        var saved = await _contentRepo.GetByIdAsync(entity.Id);
        if (saved == null)
            throw new BusinessRuleException("Failed to retrieve portfolio item after creation.");

        _logger.LogInformation("Created portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title.SanitizeForLog());
        return await ToPortfolioResponseAsync(saved);
    }

    public async Task<PortfolioItemResponse> UpdatePortfolioItemAsync(Guid id, UpdatePortfolioItemRequest request)
    {
        var entity = await _contentRepo.GetByIdAsync(id);
        if (entity == null)
            throw new NotFoundException("Portfolio item", id);

        request.ApplyToEntity(entity);

        _contentRepo.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Updated portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title.SanitizeForLog());
        return await ToPortfolioResponseAsync(entity);
    }

    public async Task DeletePortfolioItemAsync(Guid id)
    {
        var entity = await _contentRepo.GetByIdAsync(id);
        if (entity == null)
            throw new NotFoundException("Portfolio item", id);

        entity.IsPublished = false; // Soft delete — unpublish rather than remove
        entity.UpdatedAt = DateTime.UtcNow;

        _contentRepo.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Unpublished portfolio item {PortfolioId}: {Title}", entity.Id, entity.Title.SanitizeForLog());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Maps a portfolio entity to a response, replacing any blob storage URLs for
    /// ModelFileUrl and TimelapseVideoUrl with short-lived SAS URLs.
    /// External URLs (CDN, user-entered) pass through unchanged.
    /// </summary>
    private async Task<PortfolioItemResponse> ToPortfolioResponseAsync(PortfolioItem item)
    {
        var (modelUrl, timelapseUrl) = await ResolvePortfolioSasUrlsAsync(item);
        return PortfolioItemResponse.FromEntity(item) with
        {
            ModelFileUrl = modelUrl,
            TimelapseVideoUrl = timelapseUrl,
        };
    }

    private async Task<(string? ModelUrl, string? TimelapseUrl)> ResolvePortfolioSasUrlsAsync(PortfolioItem item)
    {
        var modelUrl     = item.ModelFileUrl is not null
            ? await _fileStorageService.GenerateSasFromUrlAsync(item.ModelFileUrl, PortfolioSasTtl)
            : null;
        var timelapseUrl = item.TimelapseVideoUrl is not null
            ? await _fileStorageService.GenerateSasFromUrlAsync(item.TimelapseVideoUrl, PortfolioSasTtl)
            : null;
        return (modelUrl, timelapseUrl);
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLower().Trim();
        slug = SlugInvalidChars().Replace(slug, "-");
        slug = SlugConsecutiveHyphens().Replace(slug, "-");
        slug = slug.Trim('-');
        var suffix = Guid.NewGuid().ToString("N")[..6];
        return $"{slug}-{suffix}";
    }

    [GeneratedRegex(@"[^a-z0-9\-]")]
    private static partial Regex SlugInvalidChars();

    [GeneratedRegex(@"-{2,}")]
    private static partial Regex SlugConsecutiveHyphens();
}
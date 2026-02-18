using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContentController : ControllerBase
{
    private readonly IContentService _contentService;

    public ContentController(IContentService contentService)
    {
        _contentService = contentService;
    }

    // ─── Portfolio (public) ───────────────────────────────────────────────

    /// <summary>
    /// Get featured portfolio items for the homepage.
    /// </summary>
    [HttpGet("portfolio/featured")]
    public async Task<ActionResult<IReadOnlyList<PortfolioItemResponse>>>
        GetFeaturedPortfolio([FromQuery] int count = 6)
    {
        var items = await _contentService.GetFeaturedPortfolioItemsAsync(count);
        return Ok(items);
    }

    /// <summary>
    /// Get all portfolio items (paginated).
    /// </summary>
    [HttpGet("portfolio")]
    public async Task<ActionResult<PagedResponse<PortfolioItemResponse>>>
        GetPortfolio(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
    {
        var items = await _contentService.GetPortfolioItemsAsync(page, pageSize);
        return Ok(items);
    }

    /// <summary>
    /// Get a specific portfolio item by ID.
    /// </summary>
    [HttpGet("portfolio/{id:guid}")]
    public async Task<ActionResult<PortfolioItemResponse>> GetPortfolioItem(Guid id)
    {
        var item = await _contentService.GetPortfolioItemByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    /// <summary>
    /// Get portfolio items filtered by tag.
    /// </summary>
    [HttpGet("portfolio/tag/{tag}")]
    public async Task<ActionResult<IReadOnlyList<PortfolioItemResponse>>>
        GetPortfolioByTag(string tag)
    {
        var items = await _contentService.GetPortfolioByTagAsync(tag);
        return Ok(items);
    }

    // ─── Blog (public) ────────────────────────────────────────────────────

    /// <summary>
    /// Get published blog posts (paginated).
    /// </summary>
    [HttpGet("blog")]
    public async Task<ActionResult<PagedResponse<BlogPostSummaryResponse>>>
        GetBlogPosts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
    {
        var posts = await _contentService.GetPublishedBlogPostsAsync(page, pageSize);
        return Ok(posts);
    }

    /// <summary>
    /// Get a specific blog post by its URL slug.
    /// </summary>
    [HttpGet("blog/{slug}")]
    public async Task<ActionResult<BlogPostResponse>> GetBlogPostBySlug(string slug)
    {
        var post = await _contentService.GetBlogPostBySlugAsync(slug);
        if (post == null) return NotFound();
        return Ok(post);
    }

    /// <summary>
    /// Create a new blog post. Requires Staff or Admin role.
    /// </summary>
    [HttpPost("blog")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<BlogPostResponse>> CreateBlogPost(
        CreateBlogPostRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var post = await _contentService.CreateBlogPostAsync(userId.Value, request);
            return CreatedAtAction(
                nameof(GetBlogPostBySlug),
                new { slug = post.Slug },
                post);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Tags (public) ────────────────────────────────────────────────────

    /// <summary>
    /// Get all tags from portfolio items and blog posts.
    /// </summary>
    [HttpGet("tags")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetAllTags()
    {
        var tags = await _contentService.GetAllTagsAsync();
        return Ok(tags);
    }

    // ─── Private helpers ──────────────────────────────────────────────────

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return null;
        return userId;
    }
}
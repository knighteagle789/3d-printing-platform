using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Interfaces.Services;
using PrintHub.API.Extensions;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
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

    // ─── Portfolio Management ─────────────────────────────────────────────────

    [HttpPost("portfolio")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<PortfolioItemResponse>> CreatePortfolioItem(
        CreatePortfolioItemRequest request)
    {
        var result = await _contentService.CreatePortfolioItemAsync(request);
        return CreatedAtAction(nameof(GetPortfolioItem), new { id = result.Id }, result);
    }

    [HttpPut("portfolio/{id:guid}")]
    [Authorize(Policy = "StaffOrAdmin")]
    public async Task<ActionResult<PortfolioItemResponse>> UpdatePortfolioItem(
        Guid id, UpdatePortfolioItemRequest request)
    {
        var result = await _contentService.UpdatePortfolioItemAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("portfolio/{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeletePortfolioItem(Guid id)
    {
        await _contentService.DeletePortfolioItemAsync(id);
        return NoContent();
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
        var userId = User.GetUserId();
        var post = await _contentService.CreateBlogPostAsync(userId, request);
        return CreatedAtAction(
            nameof(GetBlogPostBySlug),
            new { slug = post.Slug },
            post);
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

}
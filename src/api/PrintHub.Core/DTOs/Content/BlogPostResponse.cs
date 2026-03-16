using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Content;

/// <summary>
/// Blog post data returned by the API.
/// Used for the public blog listing and detail pages.
/// </summary>
public record BlogPostResponse(
    Guid Id,
    string Title,
    string Slug,
    string Summary,
    string Content,
    string? FeaturedImageUrl,
    string Category,
    string[]? Tags,
    bool IsPublished,
    DateTime? PublishedAt,
    int ViewCount,
    DateTime CreatedAt,
    UserSummaryResponse? Author)
{
    public static BlogPostResponse FromEntity(BlogPost post) => new(
        Id: post.Id,
        Title: post.Title,
        Slug: post.Slug,
        Summary: post.Summary,
        Content: post.Content,
        FeaturedImageUrl: post.FeaturedImageUrl,
        Category: post.Category.ToString(),
        Tags: post.Tags,
        IsPublished: post.IsPublished,
        PublishedAt: post.PublishedAt,
        ViewCount: post.ViewCount,
        CreatedAt: post.CreatedAt,
        Author: post.Author != null
            ? UserSummaryResponse.FromEntity(post.Author)
            : null
    );
}

/// <summary>
/// Condensed blog post for listing pages.
/// Excludes the full Content field to keep list responses lightweight.
/// </summary>
public record BlogPostSummaryResponse(
    Guid Id,
    string Title,
    string Slug,
    string Summary,
    string? FeaturedImageUrl,
    string Category,
    string[]? Tags,
    bool IsPublished,
    DateTime? PublishedAt,
    int ViewCount,
    UserSummaryResponse? Author)
{
    public static BlogPostSummaryResponse FromEntity(BlogPost post) => new(
        Id: post.Id,
        Title: post.Title,
        Slug: post.Slug,
        Summary: post.Summary,
        FeaturedImageUrl: post.FeaturedImageUrl,
        Category: post.Category.ToString(),
        Tags: post.Tags,
        IsPublished: post.IsPublished,
        PublishedAt: post.PublishedAt,
        ViewCount: post.ViewCount,
        Author: post.Author != null
            ? UserSummaryResponse.FromEntity(post.Author)
            : null
    );
}
namespace PrintHub.Core.DTOs.Content;

/// <summary>
/// Data required to create a new blog post.
/// Sent by admin/staff when writing content.
/// </summary>
public record CreateBlogPostRequest(
    string Title,
    string Summary,
    string Content,
    string? FeaturedImageUrl,
    string Category,
    string[]? Tags,
    bool IsPublished,
    DateTime? PublishedAt);
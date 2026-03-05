namespace PrintHub.Core.DTOs.Content;

public record UpdateBlogPostRequest(
    string? Title,
    string? Summary,
    string? Content,
    string? FeaturedImageUrl,
    string? Category,
    string[]? Tags,
    bool? IsPublished,
    DateTime? PublishedAt);
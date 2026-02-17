using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Content;

/// <summary>
/// Portfolio item data returned by the API.
/// Used for the public gallery and admin management.
/// </summary>
public record PortfolioItemResponse(
    Guid Id,
    string Title,
    string Description,
    string? DetailedDescription,
    string ImageUrl,
    string? AdditionalImages,
    string[]? Tags,
    string Category,
    bool IsFeatured,
    int DisplayOrder,
    bool IsPublished,
    string? ProjectDetails,
    DateTime CreatedAt,
    MaterialSummaryResponse? Material)
{
    public static PortfolioItemResponse FromEntity(PortfolioItem item) => new(
        Id: item.Id,
        Title: item.Title,
        Description: item.Description,
        DetailedDescription: item.DetailedDescription,
        ImageUrl: item.ImageUrl,
        AdditionalImages: item.AdditionalImages,
        Tags: item.Tags,
        Category: item.Category.ToString(),
        IsFeatured: item.IsFeatured,
        DisplayOrder: item.DisplayOrder,
        IsPublished: item.IsPublished,
        ProjectDetails: item.ProjectDetails,
        CreatedAt: item.CreatedAt,
        Material: item.Material != null
            ? MaterialSummaryResponse.FromEntity(item.Material)
            : null
    );
}
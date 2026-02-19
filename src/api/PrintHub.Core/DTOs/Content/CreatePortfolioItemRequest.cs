using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Content;

public record CreatePortfolioItemRequest(
    string Title,
    string Description,
    string? DetailedDescription,
    string Category,
    string ImageUrl,
    List<PortfolioImageDto>? AdditionalImages,
    string[]? Tags,
    Guid? MaterialId,
    string? ProjectDetails,
    int DisplayOrder,
    bool IsFeatured,
    bool IsPublished)
{
    public PortfolioItem ToEntity() => new()
    {
        Id = Guid.NewGuid(),
        Title = Title,
        Description = Description,
        DetailedDescription = DetailedDescription,
        Category = Enum.Parse<PortfolioCategory>(Category, ignoreCase: true),
        ImageUrl = ImageUrl,
        AdditionalImages = AdditionalImages?.Select(img => new PortfolioImage
        {
            Url = img.Url,
            Caption = img.Caption,
            AltText = img.AltText,
            Order = img.Order
        }).ToList(),
        Tags = Tags,
        MaterialId = MaterialId,
        ProjectDetails = ProjectDetails,
        DisplayOrder = DisplayOrder,
        IsFeatured = IsFeatured,
        IsPublished = IsPublished,
        CreatedAt = DateTime.UtcNow
    };
}
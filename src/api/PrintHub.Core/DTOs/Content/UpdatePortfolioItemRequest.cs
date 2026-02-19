using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Content;

public record UpdatePortfolioItemRequest(
    string? Title,
    string? Description,
    string? DetailedDescription,
    string? Category,
    string? ImageUrl,
    List<PortfolioImageDto>? AdditionalImages,
    string[]? Tags,
    Guid? MaterialId,
    string? ProjectDetails,
    int? DisplayOrder,
    bool? IsFeatured,
    bool? IsPublished)
{
    public void ApplyToEntity(PortfolioItem entity)
    {
        if (Title != null) entity.Title = Title;
        if (Description != null) entity.Description = Description;
        if (DetailedDescription != null) entity.DetailedDescription = DetailedDescription;
        if (Category != null) entity.Category = Enum.Parse<PortfolioCategory>(Category, ignoreCase: true);
        if (ImageUrl != null) entity.ImageUrl = ImageUrl;
        if (AdditionalImages != null) entity.AdditionalImages = AdditionalImages.Select(img => new PortfolioImage
        {
            Url = img.Url,
            Caption = img.Caption,
            AltText = img.AltText,
            Order = img.Order
        }).ToList();
        if (Tags != null) entity.Tags = Tags;
        if (MaterialId != null) entity.MaterialId = MaterialId;
        if (ProjectDetails != null) entity.ProjectDetails = ProjectDetails;
        if (DisplayOrder != null) entity.DisplayOrder = DisplayOrder.Value;
        if (IsFeatured != null) entity.IsFeatured = IsFeatured.Value;
        if (IsPublished != null) entity.IsPublished = IsPublished.Value;
        entity.UpdatedAt = DateTime.UtcNow;
    }
}
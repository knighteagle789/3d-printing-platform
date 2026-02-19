namespace PrintHub.Core.DTOs.Content;

/// <summary>
/// DTO for portfolio gallery images — used in both requests and responses.
/// </summary>
public record PortfolioImageDto(
    string Url,
    string? Caption,
    string? AltText,
    int Order)
{
    public static PortfolioImageDto FromEntity(Entities.PortfolioImage image) => new(
        Url: image.Url,
        Caption: image.Caption,
        AltText: image.AltText,
        Order: image.Order
    );
}
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Material data returned by the API.
/// Used for both list views and detail views.
/// </summary>
public record MaterialResponse(
    Guid Id,
    string Name,
    string Description,
    string Type,
    decimal PricePerGram,
    string[]? AvailableColors,
    string? Properties,
    bool IsActive,
    DateTime CreatedAt,
    PrintingTechnologyResponse? Technology)
{
    /// <summary>
    /// Maps a Material entity to a MaterialResponse DTO.
    /// </summary>
    public static MaterialResponse FromEntity(Material material) => new(
        Id: material.Id,
        Name: material.Name,
        Description: material.Description,
        Type: material.Type.ToString(),
        PricePerGram: material.PricePerGram,
        AvailableColors: material.AvailableColors,
        Properties: material.Properties,
        IsActive: material.IsActive,
        CreatedAt: material.CreatedAt,
        Technology: material.PrintingTechnology != null
            ? PrintingTechnologyResponse.FromEntity(material.PrintingTechnology)
            : null
    );
}

/// <summary>
/// Printing technology data returned alongside materials.
/// </summary>
public record PrintingTechnologyResponse(
    Guid Id,
    string Name,
    string Description,
    string Type,
    string MaxDimensions,
    string LayerHeightRange,
    decimal TypicalSpeed)
{
    public static PrintingTechnologyResponse FromEntity(PrintingTechnology technology) => new(
        Id: technology.Id,
        Name: technology.Name,
        Description: technology.Description,
        Type: technology.Type.ToString(),
        MaxDimensions: technology.MaxDimensions,
        LayerHeightRange: technology.LayerHeightRange,
        TypicalSpeed: technology.TypicalSpeed
    );
}
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Data required to create a new material.
/// Sent by admin when adding a material to the catalog.
/// </summary>
public record CreateMaterialRequest(
    string Name,
    string Description,
    string Type,
    decimal PricePerGram,
    string[]? AvailableColors,
    string? Properties,
    Guid? PrintingTechnologyId)
{
    /// <summary>
    /// Maps this request to a new Material entity.
    /// </summary>
    public Material ToEntity() => new()
    {
        Id = Guid.NewGuid(),
        Name = Name,
        Description = Description,
        Type = Enum.Parse<MaterialType>(Type, ignoreCase: true),
        PricePerGram = PricePerGram,
        AvailableColors = AvailableColors,
        Properties = Properties,
        PrintingTechnologyId = PrintingTechnologyId,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
}
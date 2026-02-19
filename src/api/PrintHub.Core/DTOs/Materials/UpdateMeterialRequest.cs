using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Data for updating an existing material.
/// All fields are nullable — only provided fields get updated.
/// </summary>
public record UpdateMaterialRequest(
    string? Name,
    string? Description,
    string? Type,
    decimal? PricePerGram,
    string[]? AvailableColors,
    string? Properties,
    Guid? PrintingTechnologyId,
    bool? IsActive)
{
    /// <summary>
    /// Applies changes from this request onto an existing Material entity.
    /// Only updates fields that were provided (non-null).
    /// </summary>
    public void ApplyToEntity(Material material)
    {
        if (Name is not null)
            material.Name = Name;

        if (Description is not null)
            material.Description = Description;

        if (Type is not null)
            material.Type = Enum.Parse<MaterialType>(Type, ignoreCase: true);

        if (PricePerGram.HasValue)
            material.PricePerGram = PricePerGram.Value;

        if (AvailableColors is not null)
            material.AvailableColors = AvailableColors;

        if (Properties is not null)
            material.Properties = Properties;

        if (PrintingTechnologyId.HasValue)
            material.PrintingTechnologyId = PrintingTechnologyId.Value;

        if (IsActive.HasValue)
            material.IsActive = IsActive.Value;
    }
}
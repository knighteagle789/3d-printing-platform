using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Data for updating an existing material. All fields nullable — only provided fields are updated.
/// </summary>
public record UpdateMaterialRequest(
    string? Type,
    string? Color,
    string? Finish,
    string? Grade,
    string? Description,
    string? Brand,
    decimal? PricePerGram,
    decimal? StockGrams,
    decimal? LowStockThresholdGrams,
    string? Notes,
    string? PrintSettings,
    Guid? PrintingTechnologyId,
    bool? IsActive)
{
    public void ApplyToEntity(Material m)
    {
        if (Type is not null)
            m.Type = Enum.Parse<MaterialType>(Type, ignoreCase: true);

        if (Color is not null)
            m.Color = Color;

        if (Finish is not null)
            m.Finish = Enum.Parse<MaterialFinish>(Finish, ignoreCase: true);

        if (Grade is not null)
            m.Grade = Enum.Parse<MaterialGrade>(Grade, ignoreCase: true);

        if (Description is not null)
            m.Description = Description;

        if (Brand is not null)
            m.Brand = Brand;

        if (PricePerGram.HasValue)
            m.PricePerGram = PricePerGram.Value;

        if (StockGrams.HasValue)
            m.StockGrams = StockGrams.Value;

        if (LowStockThresholdGrams.HasValue)
            m.LowStockThresholdGrams = LowStockThresholdGrams.Value;

        if (Notes is not null)
            m.Notes = Notes;

        if (PrintSettings is not null)
            m.PrintSettings = PrintSettings;

        if (PrintingTechnologyId.HasValue)
            m.PrintingTechnologyId = PrintingTechnologyId.Value;

        if (IsActive.HasValue)
            m.IsActive = IsActive.Value;

        m.UpdatedAt = DateTime.UtcNow;
    }
}
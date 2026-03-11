using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Data required to create a new material stock item.
/// </summary>
public record CreateMaterialRequest(
    string Type,
    string Color,
    string? Finish,
    string? Grade,
    string? Description,
    string? Brand,
    decimal PricePerGram,
    decimal StockGrams,
    decimal? LowStockThresholdGrams,
    string? Notes,
    string? PrintSettings,
    Guid? PrintingTechnologyId)
{
    public Material ToEntity() => new()
    {
        Id = Guid.NewGuid(),
        Type = Enum.Parse<MaterialType>(Type, ignoreCase: true),
        Color = Color,
        Finish = Finish != null ? Enum.Parse<MaterialFinish>(Finish, ignoreCase: true) : null,
        Grade = Grade != null ? Enum.Parse<MaterialGrade>(Grade, ignoreCase: true) : null,
        Description = Description,
        Brand = Brand,
        PricePerGram = PricePerGram,
        StockGrams = StockGrams,
        LowStockThresholdGrams = LowStockThresholdGrams,
        Notes = Notes,
        PrintSettings = PrintSettings,
        PrintingTechnologyId = PrintingTechnologyId,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
}
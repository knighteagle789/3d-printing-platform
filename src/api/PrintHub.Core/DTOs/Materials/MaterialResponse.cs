using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Materials;

/// <summary>
/// Public-facing material data. Safe to return to any authenticated or anonymous user.
/// Brand, stock levels, notes, and print settings are intentionally excluded.
/// </summary>
public record MaterialResponse(
    Guid Id,
    string Type,
    string Color,
    string? Finish,
    string? Grade,
    string? Description,
    decimal PricePerGram,
    bool IsActive,
    PrintingTechnologyResponse? Technology)
{
    public static MaterialResponse FromEntity(Material m) => new(
        Id: m.Id,
        Type: m.Type.ToString(),
        Color: m.Color,
        Finish: m.Finish?.ToString(),
        Grade: m.Grade?.ToString(),
        Description: m.Description,
        PricePerGram: m.PricePerGram,
        IsActive: m.IsActive,
        Technology: m.PrintingTechnology != null
            ? PrintingTechnologyResponse.FromEntity(m.PrintingTechnology)
            : null
    );
}

/// <summary>
/// Full material data for admin use. Includes internal fields never shown to customers.
/// </summary>
public record AdminMaterialResponse(
    Guid Id,
    string Type,
    string Color,
    string? Finish,
    string? Grade,
    string? Description,
    string? Brand,
    decimal PricePerGram,
    decimal StockGrams,
    decimal? LowStockThresholdGrams,
    bool IsLowStock,
    string? Notes,
    string? PrintSettings,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    PrintingTechnologyResponse? Technology)
{
    public static AdminMaterialResponse FromEntity(Material m) => new(
        Id: m.Id,
        Type: m.Type.ToString(),
        Color: m.Color,
        Finish: m.Finish?.ToString(),
        Grade: m.Grade?.ToString(),
        Description: m.Description,
        Brand: m.Brand,
        PricePerGram: m.PricePerGram,
        StockGrams: m.StockGrams,
        LowStockThresholdGrams: m.LowStockThresholdGrams,
        IsLowStock: m.LowStockThresholdGrams.HasValue && m.StockGrams <= m.LowStockThresholdGrams.Value,
        Notes: m.Notes,
        PrintSettings: m.PrintSettings,
        IsActive: m.IsActive,
        CreatedAt: m.CreatedAt,
        UpdatedAt: m.UpdatedAt,
        Technology: m.PrintingTechnology != null
            ? PrintingTechnologyResponse.FromEntity(m.PrintingTechnology)
            : null
    );
}

/// <summary>
/// Printing technology data embedded in material responses.
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
    public static PrintingTechnologyResponse FromEntity(PrintingTechnology t) => new(
        Id: t.Id,
        Name: t.Name,
        Description: t.Description,
        Type: t.Type.ToString(),
        MaxDimensions: t.MaxDimensions,
        LayerHeightRange: t.LayerHeightRange,
        TypicalSpeed: t.TypicalSpeed
    );
}
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Orders;

/// <summary>
/// Individual order item data.
/// Includes material info and print settings.
/// </summary>
public record OrderItemResponse(
    Guid Id,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string? Color,
    string? SpecialInstructions,
    decimal? EstimatedWeight,
    decimal? EstimatedPrintTime,
    string Quality,
    decimal? Infill,
    bool SupportStructures,
    MaterialSummaryResponse? Material,
    FileSummaryResponse? File)
{
    public static OrderItemResponse FromEntity(OrderItem item) => new(
        Id: item.Id,
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
        TotalPrice: item.TotalPrice,
        Color: item.Color,
        SpecialInstructions: item.SpecialInstructions,
        EstimatedWeight: item.EstimatedWeight,
        EstimatedPrintTime: item.EstimatedPrintTime,
        Quality: item.Quality.ToString(),
        Infill: item.Infill,
        SupportStructures: item.SupportStructures,
        Material: item.Material != null
            ? MaterialSummaryResponse.FromEntity(item.Material)
            : null,
        File: item.File != null
            ? FileSummaryResponse.FromEntity(item.File)
            : null
    );
}

/// <summary>
/// Minimal material info embedded in order items.
/// Just enough to display what material was chosen.
/// </summary>
public record MaterialSummaryResponse(
    Guid Id,
    string Name,
    string Type,
    decimal PricePerGram)
{
    public static MaterialSummaryResponse FromEntity(Material material) => new(
        Id: material.Id,
        Name: material.Name,
        Type: material.Type.ToString(),
        PricePerGram: material.PricePerGram
    );
}

/// <summary>
/// Minimal file info embedded in order items.
/// Just enough to show which file is being printed.
/// </summary>
public record FileSummaryResponse(
    Guid Id,
    string OriginalFileName,
    long FileSizeBytes,
    bool IsAnalyzed)
{
    public static FileSummaryResponse FromEntity(UploadedFile file) => new(
        Id: file.Id,
        OriginalFileName: file.OriginalFileName,
        FileSizeBytes: file.FileSizeBytes,
        IsAnalyzed: file.IsAnalyzed
    );
}

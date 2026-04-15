using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Quotes;

/// <summary>
/// Per-file breakdown within a quote request response.
/// Includes analysis snapshot and computed cost line items.
/// </summary>
public record QuoteFileItemResponse(
    Guid Id,
    Guid FileId,
    string OriginalFileName,
    int Quantity,
    string? Color,
    string? MaterialType,
    string? MaterialColor,
    decimal? DimensionX,
    decimal? DimensionY,
    decimal? DimensionZ,
    decimal? EstimatedWeightGrams,
    decimal? EstimatedPrintTimeHours,
    decimal? MaterialCost,
    decimal? MachineCost,
    bool ExceedsBuildVolume)
{
    public static QuoteFileItemResponse FromEntity(QuoteRequestFile f) => new(
        Id:                      f.Id,
        FileId:                  f.FileId,
        OriginalFileName:        f.File?.OriginalFileName ?? string.Empty,
        Quantity:                f.Quantity,
        Color:                   f.Color,
        MaterialType:            f.Material?.Type.ToString(),
        MaterialColor:           f.Material?.Color,
        DimensionX:              f.DimensionX,
        DimensionY:              f.DimensionY,
        DimensionZ:              f.DimensionZ,
        EstimatedWeightGrams:    f.EstimatedWeightGrams,
        EstimatedPrintTimeHours: f.EstimatedPrintTimeHours,
        MaterialCost:            f.MaterialCost,
        MachineCost:             f.MachineCost,
        ExceedsBuildVolume:      f.ExceedsBuildVolume);
}

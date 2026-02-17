using PrintHub.Core.Entities;

namespace PrintHub.Core.DTOs.Files;

/// <summary>
/// 3D model analysis results returned by the API.
/// All measurements are optional because analysis might be partial
/// (e.g., failed midway or file format doesn't support all calculations).
/// </summary>
public record FileAnalysisResponse(
    decimal? VolumeInCubicMm,
    decimal? DimensionX,
    decimal? DimensionY,
    decimal? DimensionZ,
    int? TriangleCount,
    int? VertexCount,
    decimal? SurfaceArea,
    decimal? EstimatedPrintTimeHours,
    decimal? EstimatedWeightGrams,
    int? ComplexityScore,
    bool? RequiresSupport,
    bool? IsManifold,
    int? ErrorCount,
    string? Warnings,
    string? ThumbnailUrl,
    DateTime AnalyzedAt)
{
    public static FileAnalysisResponse FromEntity(FileAnalysis analysis) => new(
        VolumeInCubicMm: analysis.VolumeInCubicMm,
        DimensionX: analysis.DimensionX,
        DimensionY: analysis.DimensionY,
        DimensionZ: analysis.DimensionZ,
        TriangleCount: analysis.TriangleCount,
        VertexCount: analysis.VertexCount,
        SurfaceArea: analysis.SurfaceArea,
        EstimatedPrintTimeHours: analysis.EstimatedPrintTimeHours,
        EstimatedWeightGrams: analysis.EstimatedWeightGrams,
        ComplexityScore: analysis.ComplexityScore,
        RequiresSupport: analysis.RequiresSupport,
        IsManifold: analysis.IsManifold,
        ErrorCount: analysis.ErrorCount,
        Warnings: analysis.Warnings,
        ThumbnailUrl: analysis.ThumbnailUrl,
        AnalyzedAt: analysis.AnalyzedAt
    );
}
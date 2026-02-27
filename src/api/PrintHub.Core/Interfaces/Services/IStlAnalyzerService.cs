namespace PrintHub.Core.Interfaces.Services;

public record StlAnalysisResult(
    decimal VolumeInCubicMm,
    decimal SurfaceArea,
    decimal DimensionX,
    decimal DimensionY,
    decimal DimensionZ,
    int TriangleCount,
    int VertexCount,
    bool IsManifold,
    bool RequiresSupport,
    decimal EstimatedWeightGrams,
    decimal EstimatedPrintTimeHours,
    int ComplexityScore,
    string[] Warnings);

public interface IStlAnalyzerService
{
    Task<StlAnalysisResult?> AnalyzeAsync(Stream fileStream, string fileName);
}
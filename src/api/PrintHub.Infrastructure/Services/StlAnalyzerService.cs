using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Common;
using PrintHub.Core.Interfaces.Services;
using System.Numerics;

namespace PrintHub.Infrastructure.Services;

public class StlAnalyzerService : IStlAnalyzerService
{
    private readonly ILogger<StlAnalyzerService> _logger;

    // ── Physical constants ──────────────────────────────────────────────────
    // PLA density in g/cm³ — used for weight estimation.
    // A future improvement could pull density from material PrintSettings.
    private const decimal PlaDensity = 1.24m;

    // Fraction of volume that is solid material (accounts for infill + walls).
    // 0.25 ≈ 20% infill with ~2 perimeters — a reasonable "Standard" default.
    // TODO (GH-24): replace with per-material infill from PrintSettings once
    //               the order form infill value is wired through to analysis.
    private const decimal InfillFraction = 0.25m;

    // Standard FDM layer height (mm). Matches our "Standard" quality tier.
    private const decimal DefaultLayerHeightMm = 0.20m;

    // Standard 0.4mm nozzle. CR-10 ships with this.
    private const decimal NozzleDiameterMm = 0.40m;

    // Overhead per print: heat-up, homing, skirt, cooling = ~8 minutes.
    private const decimal OverheadMinutes = 8m;

    // ── Configurable default print speed ───────────────────────────────────
    // Pulled from FileAnalysis:DefaultPrintSpeedMmPerSec in appsettings.
    // Falls back to 50 mm/s — a conservative CR-10 FDM speed.
    // Individual materials override this via their PrintSettings JSONB,
    // but since analysis runs before material selection, we use this default.
    // TODO (GH-24 slicer follow-up): pass material settings into analysis.
    private readonly decimal _defaultPrintSpeedMmPerSec;

    public StlAnalyzerService(IConfiguration configuration, ILogger<StlAnalyzerService> logger)
    {
        _logger = logger;
        _defaultPrintSpeedMmPerSec = configuration
            .GetValue<decimal>("FileAnalysis:DefaultPrintSpeedMmPerSec", 50m);
    }

    public async Task<StlAnalysisResult?> AnalyzeAsync(Stream fileStream, string fileName)
    {
        try
        {
            // Azure Blob download streams (RetriableStream) are neither seekable nor
            // Length-aware. Buffer into a MemoryStream before parsing so that
            // ParseStlAsync can call stream.Length and stream.Seek freely.
            Stream parseStream = fileStream;
            if (!fileStream.CanSeek)
            {
                var ms = new MemoryStream();
                await fileStream.CopyToAsync(ms);
                ms.Seek(0, SeekOrigin.Begin);
                parseStream = ms;
            }

            var triangles = await ParseStlAsync(parseStream, fileName);
            if (triangles.Count == 0)
                return null;

            var volume      = CalculateVolume(triangles);
            var surfaceArea = CalculateSurfaceArea(triangles);
            var (minX, minY, minZ, maxX, maxY, maxZ) = CalculateBoundingBox(triangles);

            var dimX = (decimal)(maxX - minX);
            var dimY = (decimal)(maxY - minY);
            var dimZ = (decimal)(maxZ - minZ);

            var volumeCm3          = volume / 1000m;
            var estimatedWeight    = volumeCm3 * PlaDensity * InfillFraction;
            var estimatedPrintTime = EstimatePrintTimeHours(volume, surfaceArea, dimZ);

            var complexityScore = CalculateComplexityScore(triangles.Count, volume, surfaceArea);
            var requiresSupport = DetectOverhangs(triangles);
            var isManifold      = CheckManifold(triangles);
            var warnings        = BuildWarnings(triangles.Count, dimX, dimY, dimZ, isManifold).ToArray();

            return new StlAnalysisResult(
                VolumeInCubicMm:         volume,
                SurfaceArea:             surfaceArea,
                DimensionX:              dimX,
                DimensionY:              dimY,
                DimensionZ:              dimZ,
                TriangleCount:           triangles.Count,
                VertexCount:             triangles.Count * 3,
                IsManifold:              isManifold,
                RequiresSupport:         requiresSupport,
                EstimatedWeightGrams:    estimatedWeight,
                EstimatedPrintTimeHours: estimatedPrintTime,
                ComplexityScore:         complexityScore,
                Warnings:                warnings
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze STL file: {FileName}", fileName.SanitizeForLog());
            return null;
        }
    }

    /// <summary>
    /// Estimates FDM print time using a layer-based volumetric approach.
    ///
    /// Steps:
    ///   1. Calculate the number of layers from the Z height.
    ///   2. Estimate the volume of material extruded per layer
    ///      (infill volume + two-perimeter wall volume).
    ///   3. Convert extruded volume to linear filament length,
    ///      then divide by print speed to get time per layer.
    ///   4. Add a fixed overhead for heat-up, homing, and cooling.
    ///
    /// Accuracy: within ~20-30% of real slicer output for typical prints.
    /// Complex geometry (lots of supports, islands) may underestimate.
    /// Calibration data from real CR-10 prints should be used to tune
    /// InfillFraction and OverheadMinutes over time.
    /// </summary>
    private decimal EstimatePrintTimeHours(decimal volumeMm3, decimal surfaceAreaMm2, decimal dimZMm)
    {
        if (dimZMm <= 0 || volumeMm3 <= 0)
            return 0m;

        // Number of layers
        var layerCount = Math.Max(1m, dimZMm / DefaultLayerHeightMm);

        // Volume of solid material to extrude (infill + perimeter walls)
        // Wall volume ≈ surfaceArea × one nozzle width deep (two perimeters)
        var wallVolumeMm3   = surfaceAreaMm2 * NozzleDiameterMm * 2m;
        var infillVolumeMm3 = volumeMm3 * InfillFraction;
        var totalExtrudeMm3 = infillVolumeMm3 + wallVolumeMm3;

        // Nozzle cross-section area (circular approximation)
        var nozzleAreaMm2 = (decimal)Math.PI * (NozzleDiameterMm / 2m) * (NozzleDiameterMm / 2m);

        // Time to extrude all material at print speed (seconds)
        // extrudeLength = totalVolume / nozzleArea; time = length / speed
        var extrudeLengthMm  = nozzleAreaMm2 > 0 ? totalExtrudeMm3 / nozzleAreaMm2 : 0m;
        var printTimeSeconds = _defaultPrintSpeedMmPerSec > 0
            ? extrudeLengthMm / _defaultPrintSpeedMmPerSec
            : 0m;

        // Add fixed overhead (heat-up, homing, skirt, cooling)
        var totalSeconds = printTimeSeconds + (OverheadMinutes * 60m);

        return Math.Round(totalSeconds / 3600m, 2);
    }

    // ── STL parsing (unchanged) ─────────────────────────────────────────────

    private static async Task<List<(Vector3 v1, Vector3 v2, Vector3 v3)>> ParseStlAsync(
        Stream stream, string fileName)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();

        var header = new byte[80];
        await stream.ReadExactlyAsync(header, 0, 80);

        var countBytes = new byte[4];
        await stream.ReadExactlyAsync(countBytes, 0, 4);
        var triangleCount = BitConverter.ToUInt32(countBytes, 0);

        var expectedBinarySize = 84 + (long)triangleCount * 50;
        var isBinary = stream.Length == expectedBinarySize && triangleCount < 5_000_000;

        stream.Seek(0, SeekOrigin.Begin);

        triangles = isBinary
            ? await ParseBinaryStlAsync(stream)
            : await ParseAsciiStlAsync(stream);

        return triangles;
    }

    private static async Task<List<(Vector3, Vector3, Vector3)>> ParseBinaryStlAsync(Stream stream)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();
        var reader    = new BinaryReader(stream);

        reader.ReadBytes(80);
        var count = reader.ReadUInt32();

        for (uint i = 0; i < count; i++)
        {
            reader.ReadBytes(12);
            var v1 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            var v2 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            var v3 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            reader.ReadUInt16();
            triangles.Add((v1, v2, v3));
        }

        await Task.CompletedTask;
        return triangles;
    }

    private static async Task<List<(Vector3, Vector3, Vector3)>> ParseAsciiStlAsync(Stream stream)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();
        using var reader = new StreamReader(stream, leaveOpen: true);

        var    verts     = new Vector3[3];
        int    vertIndex = 0;
        string? line;

        while ((line = await reader.ReadLineAsync()) != null)
        {
            line = line.Trim();
            if (!line.StartsWith("vertex ")) continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 4) continue;

            verts[vertIndex++] = new Vector3(
                float.Parse(parts[1]),
                float.Parse(parts[2]),
                float.Parse(parts[3]));

            if (vertIndex == 3)
            {
                triangles.Add((verts[0], verts[1], verts[2]));
                vertIndex = 0;
            }
        }

        return triangles;
    }

    // ── Geometry helpers (unchanged) ────────────────────────────────────────

    private static decimal CalculateVolume(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        double volume = 0;
        foreach (var (v1, v2, v3) in triangles)
            volume += Vector3.Dot(v1, Vector3.Cross(v2, v3)) / 6.0;
        return Math.Abs((decimal)volume);
    }

    private static decimal CalculateSurfaceArea(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        double area = 0;
        foreach (var (v1, v2, v3) in triangles)
        {
            var edge1 = v2 - v1;
            var edge2 = v3 - v1;
            area += Vector3.Cross(edge1, edge2).Length() / 2.0;
        }
        return (decimal)area;
    }

    private static (float minX, float minY, float minZ, float maxX, float maxY, float maxZ)
        CalculateBoundingBox(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
        float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;

        foreach (var (v1, v2, v3) in triangles)
        {
            foreach (var v in new[] { v1, v2, v3 })
            {
                minX = Math.Min(minX, v.X); minY = Math.Min(minY, v.Y); minZ = Math.Min(minZ, v.Z);
                maxX = Math.Max(maxX, v.X); maxY = Math.Max(maxY, v.Y); maxZ = Math.Max(maxZ, v.Z);
            }
        }

        return (minX, minY, minZ, maxX, maxY, maxZ);
    }

    private static bool DetectOverhangs(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        foreach (var (v1, v2, v3) in triangles)
        {
            var normal = Vector3.Normalize(Vector3.Cross(v2 - v1, v3 - v1));
            if (normal.Z < -0.5f) return true;
        }
        return false;
    }

    private static bool CheckManifold(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        var edgeCounts = new Dictionary<(Vector3, Vector3), int>();
        foreach (var (v1, v2, v3) in triangles)
        {
            AddEdge(edgeCounts, v1, v2);
            AddEdge(edgeCounts, v2, v3);
            AddEdge(edgeCounts, v3, v1);
        }
        return edgeCounts.Values.All(count => count == 2);
    }

    private static void AddEdge(Dictionary<(Vector3, Vector3), int> edges, Vector3 a, Vector3 b)
    {
        var key = a.X < b.X || (a.X == b.X && a.Y < b.Y) ? (a, b) : (b, a);
        edges[key] = edges.TryGetValue(key, out var count) ? count + 1 : 1;
    }

    private static int CalculateComplexityScore(int triangleCount, decimal volume, decimal surfaceArea)
    {
        var density = volume > 0 ? (decimal)triangleCount / volume : 0;
        return (int)Math.Min(100, Math.Max(1, density * 10));
    }

    private static IEnumerable<string> BuildWarnings(
        int triangleCount, decimal dimX, decimal dimY, decimal dimZ, bool isManifold)
    {
        if (triangleCount > 500_000)
            yield return "High triangle count may increase processing time.";
        if (dimX > 300 || dimY > 300 || dimZ > 300)
            yield return "Model exceeds typical 300mm print volume on one or more axes.";
        if (!isManifold)
            yield return "Model has non-manifold geometry which may cause print issues.";
    }
}
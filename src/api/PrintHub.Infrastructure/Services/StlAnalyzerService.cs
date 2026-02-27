using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;
using System.Numerics;

namespace PrintHub.Infrastructure.Services;

public class StlAnalyzerService : IStlAnalyzerService
{
    private readonly ILogger<StlAnalyzerService> _logger;

    // PLA density g/cm³
    private const decimal PlaDensity = 1.24m;
    // Assumed 20% infill multiplier
    private const decimal InfillMultiplier = 0.3m;
    // mm/s print speed assumption
    private const decimal PrintSpeedMmPerSec = 50m;

    public StlAnalyzerService(ILogger<StlAnalyzerService> logger)
    {
        _logger = logger;
    }

    public async Task<StlAnalysisResult?> AnalyzeAsync(Stream fileStream, string fileName)
    {
        try
        {
            var triangles = await ParseStlAsync(fileStream, fileName);
            if (triangles.Count == 0)
                return null;

            var volume = CalculateVolume(triangles);
            var surfaceArea = CalculateSurfaceArea(triangles);
            var (minX, minY, minZ, maxX, maxY, maxZ) = CalculateBoundingBox(triangles);

            var dimX = (decimal)(maxX - minX);
            var dimY = (decimal)(maxY - minY);
            var dimZ = (decimal)(maxZ - minZ);

            var volumeCm3 = volume / 1000m;
            var estimatedWeight = volumeCm3 * PlaDensity * InfillMultiplier;

            // Rough print time: surface area / (speed * nozzle width approximation)
            var printTimeHours = surfaceArea / (PrintSpeedMmPerSec * 3600m * 0.4m);

            var complexityScore = CalculateComplexityScore(triangles.Count, volume, surfaceArea);
            var requiresSupport = DetectOverhangs(triangles);
            var isManifold = CheckManifold(triangles);
            var warnings = BuildWarnings(triangles.Count, dimX, dimY, dimZ, isManifold).ToArray();

            return new StlAnalysisResult(
                VolumeInCubicMm: volume,
                SurfaceArea: surfaceArea,
                DimensionX: dimX,
                DimensionY: dimY,
                DimensionZ: dimZ,
                TriangleCount: triangles.Count,
                VertexCount: triangles.Count * 3,
                IsManifold: isManifold,
                RequiresSupport: requiresSupport,
                EstimatedWeightGrams: estimatedWeight,
                EstimatedPrintTimeHours: printTimeHours,
                ComplexityScore: complexityScore,
                Warnings: warnings
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze STL file: {FileName}", fileName);
            return null;
        }
    }

    private static async Task<List<(Vector3 v1, Vector3 v2, Vector3 v3)>> ParseStlAsync(
        Stream stream, string fileName)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();

        // Peek to determine binary vs ASCII
        var header = new byte[80];
        await stream.ReadExactlyAsync(header, 0, 80);

        var countBytes = new byte[4];
        await stream.ReadExactlyAsync(countBytes, 0, 4);
        var triangleCount = BitConverter.ToUInt32(countBytes, 0);

        // Binary STL: 80 header + 4 count + (triangleCount * 50 bytes)
        var expectedBinarySize = 84 + (long)triangleCount * 50;
        var isBinary = stream.Length == expectedBinarySize && triangleCount < 5_000_000;

        stream.Seek(0, SeekOrigin.Begin);

        if (isBinary)
        {
            triangles = await ParseBinaryStlAsync(stream);
        }
        else
        {
            // ASCII STL
            stream.Seek(0, SeekOrigin.Begin);
            triangles = await ParseAsciiStlAsync(stream);
        }

        return triangles;
    }

    private static async Task<List<(Vector3, Vector3, Vector3)>> ParseBinaryStlAsync(Stream stream)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();
        var reader = new BinaryReader(stream);

        reader.ReadBytes(80); // skip header
        var count = reader.ReadUInt32();

        for (uint i = 0; i < count; i++)
        {
            reader.ReadBytes(12); // skip normal
            var v1 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            var v2 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            var v3 = new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
            reader.ReadUInt16(); // attribute byte count
            triangles.Add((v1, v2, v3));
        }

        await Task.CompletedTask;
        return triangles;
    }

    private static async Task<List<(Vector3, Vector3, Vector3)>> ParseAsciiStlAsync(Stream stream)
    {
        var triangles = new List<(Vector3, Vector3, Vector3)>();
        using var reader = new StreamReader(stream, leaveOpen: true);

        Vector3[] verts = new Vector3[3];
        int vertIndex = 0;

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

    private static decimal CalculateVolume(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        double volume = 0;
        foreach (var (v1, v2, v3) in triangles)
        {
            // Signed volume of tetrahedron formed with origin
            volume += Vector3.Dot(v1, Vector3.Cross(v2, v3)) / 6.0;
        }
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
        // A triangle requires support if its normal points significantly downward (Z < -0.5)
        foreach (var (v1, v2, v3) in triangles)
        {
            var normal = Vector3.Normalize(Vector3.Cross(v2 - v1, v3 - v1));
            if (normal.Z < -0.5f)
                return true;
        }
        return false;
    }

    private static bool CheckManifold(List<(Vector3 v1, Vector3 v2, Vector3 v3)> triangles)
    {
        // A manifold mesh has every edge shared by exactly 2 triangles
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
        // Normalize edge direction so (a,b) and (b,a) are the same key
        var key = a.X < b.X || (a.X == b.X && a.Y < b.Y) ? (a, b) : (b, a);
        edges[key] = edges.TryGetValue(key, out var count) ? count + 1 : 1;
    }

    private static int CalculateComplexityScore(int triangleCount, decimal volume, decimal surfaceArea)
    {
        // Score 1-100 based on triangle density relative to volume
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
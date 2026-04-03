using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.Infrastructure.Services.Extraction;

/// <summary>
/// Azure AI Vision 4.0 Image Analysis extraction provider.
///
/// Uses a single synchronous POST to:
///   /computervision/imageanalysis:analyze?api-version=2024-02-01&amp;features=read,tags,caption
///
/// - 'read':    OCR text  → brand, material type, weight, batch/lot, label-printed color name
/// - 'tags':    visual AI → physical filament color from the image itself (the key gap in v3.2)
/// - 'caption': natural-language description → supplementary context
///
/// Requires a Computer Vision resource in a region that supports Image Analysis 4.0
/// (eastus, westus, westeurope, etc.) and the same Ocp-Apim-Subscription-Key auth header.
///
/// Config keys (unchanged): Intake:Extractor:AzureVision:Endpoint  /  :Key
/// </summary>
public class AzureVisionExtractionProvider : IExtractionProvider
{
    // ── Static lookup tables ──────────────────────────────────────────────────

    private static readonly Regex WeightRegex = new(
        @"(?<value>\d+(?:[.,]\d+)?)\s*(?<unit>kg|g|gram|grams)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex BatchRegex = new(
        @"\b(?:LOT|BATCH|BN|B\/N|SN|LOT#|BATCH#)[:\s#\-]*([\w\-]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Brand names to match against OCR text (case-insensitive substring match).
    /// Add new brands here — order matters: longer/more-specific names first.
    /// </summary>
    private static readonly string[] KnownBrands =
    [
        "Filamentum", "Proto-Pasta", "MatterHackers", "ColorFabb",  // multi-word first
        "Prusament", "Polymaker", "PolyTerra", "Hatchbox", "Overture",
        "Fiberlogy", "FormFutura", "3DXTech", "Raise3D", "Extrudr",
        "Elegoo", "Siraya", "Bambu", "Sunlu", "Eryone",
        "eSUN", "ESUN", "Ziro", "AMOLEN", "Geeetech", "Snapmaker",
        "Anycubic", "Creality", "Atomic", "Ultimaker", "MakerBot",
        "Duramic", "HiDream", "Paramount", "Verbatim", "Das Filament",
    ];

    /// <summary>
    /// Maps OCR text tokens → canonical material-type strings.
    /// Evaluated longest-match first; fall through to short tokens last.
    /// </summary>
    private static readonly (string Token, string Canonical)[] MaterialTypeMap =
    [
        ("PLA-CF",         "PLA-CF"),
        ("PETG-CF",        "PETG-CF"),
        ("PLA CF",         "PLA-CF"),
        ("PETG CF",        "PETG-CF"),
        ("PLA PRO",        "PLA"),
        ("PLA+",           "PLA"),
        ("PETG",           "PETG"),
        ("PET-G",          "PETG"),
        ("ABS+",           "ABS"),
        ("ABS",            "ABS"),
        ("ASA",            "ASA"),
        ("TPU",            "TPU"),
        ("TPE",            "TPE"),
        ("PA-CF",          "Nylon"),
        ("PA12",           "Nylon"),
        ("PA6",            "Nylon"),
        ("Nylon",          "Nylon"),
        ("HIPS",           "HIPS"),
        ("PVA",            "PVA"),
        ("Polycarbonate",  "PC"),
        ("PEEK",           "PEEK"),
        ("PEKK",           "PEKK"),
        ("Resin",          "Resin"),
        ("CPE",            "CPE"),
        ("PLA",            "PLA"),   // simple 3-letter last so PLA-CF matches first
    ];

    /// <summary>
    /// Color tag names returned by Azure AI Vision's visual tagging feature.
    /// When a tag whose name is in this set has confidence ≥ 0.60, we use it as the
    /// color — this captures the physical filament color even when the label isn't
    /// photographed clearly.
    /// </summary>
    private static readonly HashSet<string> VisualColorTagNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "red",   "orange",  "yellow",  "green",   "blue",   "purple",  "violet",
        "pink",  "brown",   "black",   "white",   "gray",   "grey",    "silver",
        "gold",  "cyan",    "magenta", "teal",    "turquoise", "navy", "maroon",
        "olive", "coral",   "salmon",  "cream",   "beige",  "transparent", "clear",
        "natural",
    };

    /// <summary>
    /// Specific filament color names found on labels (longest/most-specific first).
    /// Matched against OCR text; takes priority over visual-tag color because the
    /// label text is always more precise than "blue".
    /// </summary>
    private static readonly string[] KnownFilamentColorNames =
    [
        "Galaxy Black", "Jet Black", "True Black",
        "Pure White", "Marble White", "Ivory White",
        "Galaxy Silver", "Stainless Steel",
        "Signal Red", "Traffic Red", "Wine Red", "Carmine Red",
        "Azure Blue", "Galaxy Blue", "Navy Blue", "Sky Blue", "Cobalt Blue",
        "Grass Green", "Leaf Green", "Olive Green", "Forest Green",
        "Galaxy Purple", "Royal Purple",
        "Gentlemen Grey", "Light Grey", "Dark Grey",
        "Orange", "Yellow", "Pink", "Brown", "Gold", "Copper",
        "Transparent", "Natural", "Clear",
        "Teal", "Cyan", "Magenta", "Coral", "Lime",
        // Single-word fallbacks last (will match if nothing more specific did)
        "Black", "White", "Silver", "Red", "Blue", "Green", "Purple",
        "Grey", "Gray",
    ];

    // ── Instance ──────────────────────────────────────────────────────────────

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AzureVisionExtractionProvider> _logger;

    public AzureVisionExtractionProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AzureVisionExtractionProvider> logger)
    {
        _httpClient    = httpClient;
        _configuration = configuration;
        _logger        = logger;
    }

    // ── Main extraction ───────────────────────────────────────────────────────

    public async Task<ExtractionResult> ExtractAsync(
        ExtractionRequest request,
        CancellationToken cancellationToken = default)
    {
        var endpoint = _configuration["Intake:Extractor:AzureVision:Endpoint"];
        var apiKey   = _configuration["Intake:Extractor:AzureVision:Key"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning(
                "Azure AI Vision is not configured (missing Endpoint/Key) for intake {IntakeId}.",
                request.IntakeId);
            return Failed("Azure AI Vision configuration is missing (Endpoint/Key).");
        }

        try
        {
            // Single synchronous call — no polling required unlike v3.2 Read
            var analyzeUrl =
                $"{endpoint.TrimEnd('/')}/computervision/imageanalysis:analyze" +
                "?api-version=2024-02-01&features=read,tags,caption";

            using var httpReq = new HttpRequestMessage(HttpMethod.Post, analyzeUrl)
            {
                Content = JsonContent.Create(new { url = request.NormalizedPhotoUrl }),
            };
            httpReq.Headers.Add("Ocp-Apim-Subscription-Key", apiKey);

            using var httpResp = await _httpClient.SendAsync(httpReq, cancellationToken);

            if (!httpResp.IsSuccessStatusCode)
            {
                var errorBody = await httpResp.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Azure AI Vision analyze returned {Status} for intake {IntakeId}: {Body}",
                    (int)httpResp.StatusCode, request.IntakeId, errorBody);
                return Failed($"Azure AI Vision analyze failed: {(int)httpResp.StatusCode}");
            }

            var root = await httpResp.Content.ReadFromJsonAsync<JsonElement>(
                cancellationToken: cancellationToken);

            // ── OCR ───────────────────────────────────────────────────────────
            var ocrText = ExtractOcrText(root);
            var lower   = ocrText.ToLowerInvariant();

            // ── Brand ─────────────────────────────────────────────────────────
            var brand = KnownBrands.FirstOrDefault(b =>
                lower.Contains(b.ToLowerInvariant()));

            // ── Material type ─────────────────────────────────────────────────
            string? materialType = null;
            foreach (var (token, canonical) in MaterialTypeMap)
            {
                if (lower.Contains(token.ToLowerInvariant()))
                {
                    materialType = canonical;
                    break;
                }
            }

            // ── Spool weight ──────────────────────────────────────────────────
            decimal? spoolWeight = null;
            string?  weightSource = null;
            var weightMatch = WeightRegex.Match(lower);
            if (weightMatch.Success &&
                decimal.TryParse(
                    weightMatch.Groups["value"].Value.Replace(',', '.'),
                    System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var parsedWeight))
            {
                var unit = weightMatch.Groups["unit"].Value.ToLowerInvariant();
                spoolWeight  = unit == "kg" ? parsedWeight * 1000m : parsedWeight;
                weightSource = weightMatch.Value;
            }

            // ── Batch / lot ───────────────────────────────────────────────────
            var batchMatch = BatchRegex.Match(ocrText);
            var batchOrLot = batchMatch.Success ? batchMatch.Groups[1].Value : null;

            // ── Color: label text wins over visual tag ─────────────────────────
            // Many labels print the color name explicitly ("Galaxy Black", "Traffic Red").
            // Fall back to Azure's visual tagging when no printed name is found.
            var colorFromLabel = ExtractColorFromOcrText(ocrText);
            var (colorFromTag, tagConf) = ExtractColorFromTags(root);

            string? color;
            double  colorConf;
            string? colorSource;

            if (colorFromLabel is not null)
            {
                color       = colorFromLabel;
                colorConf   = 0.82;
                colorSource = $"label: {colorFromLabel}";
            }
            else if (colorFromTag is not null)
            {
                color       = Capitalize(colorFromTag);
                colorConf   = tagConf;
                colorSource = $"visual tag: {colorFromTag}";
            }
            else
            {
                color       = null;
                colorConf   = 0.0;
                colorSource = null;
            }

            _logger.LogInformation(
                "Azure AI Vision 4.0 extraction completed for intake {IntakeId} — " +
                "Brand={Brand} Type={Type} Color={Color} Weight={Weight}",
                request.IntakeId, brand, materialType, color, spoolWeight);

            return new ExtractionResult(
                Success:           true,
                ErrorMessage:      null,
                Brand:             brand,
                MaterialType:      materialType,
                Color:             color,
                SpoolWeightGrams:  spoolWeight,
                PrintSettingsHints: null,
                BatchOrLot:        batchOrLot,
                Confidence: new ExtractionConfidence(
                    Brand:              new FieldConfidence(brand        is not null ? 0.75 : 0.0, brand),
                    MaterialType:       new FieldConfidence(materialType is not null ? 0.80 : 0.0, materialType),
                    Color:              new FieldConfidence(colorConf,   colorSource),
                    SpoolWeightGrams:   new FieldConfidence(spoolWeight.HasValue ? 0.78 : 0.0, weightSource),
                    PrintSettingsHints: new FieldConfidence(0.0, null),
                    BatchOrLot:         new FieldConfidence(batchOrLot  is not null ? 0.65 : 0.0, batchOrLot)
                )
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Azure AI Vision 4.0 extraction threw an exception for intake {IntakeId}",
                request.IntakeId);
            return Failed(ex.Message);
        }
    }

    // ── OCR helpers ───────────────────────────────────────────────────────────

    /// <summary>
    /// Pulls all text lines from the v4.0 'readResult.blocks[].lines[].text' structure.
    /// (v3.2 used analyzeResult.readResults; v4.0 uses readResult.blocks — different shape.)
    /// </summary>
    private static string ExtractOcrText(JsonElement root)
    {
        if (!root.TryGetProperty("readResult", out var readResult)) return string.Empty;
        if (!readResult.TryGetProperty("blocks",    out var blocks))    return string.Empty;

        var lines = new List<string>();
        foreach (var block in blocks.EnumerateArray())
        {
            if (!block.TryGetProperty("lines", out var lineArr)) continue;
            foreach (var line in lineArr.EnumerateArray())
            {
                if (line.TryGetProperty("text", out var textProp))
                {
                    var t = textProp.GetString();
                    if (!string.IsNullOrWhiteSpace(t)) lines.Add(t);
                }
            }
        }
        return string.Join(" ", lines);
    }

    // ── Color helpers ─────────────────────────────────────────────────────────

    private static string? ExtractColorFromOcrText(string ocrText)
    {
        foreach (var name in KnownFilamentColorNames)
        {
            if (ocrText.Contains(name, StringComparison.OrdinalIgnoreCase))
                return name;
        }
        return null;
    }

    private static (string? Color, double Confidence) ExtractColorFromTags(JsonElement root)
    {
        if (!root.TryGetProperty("tagsResult", out var tagsResult)) return (null, 0.0);
        if (!tagsResult.TryGetProperty("values",    out var values))    return (null, 0.0);

        string? bestColor = null;
        double  bestConf  = 0.0;

        foreach (var tag in values.EnumerateArray())
        {
            if (!tag.TryGetProperty("name",       out var nameProp)) continue;
            if (!tag.TryGetProperty("confidence", out var confProp)) continue;

            var name = nameProp.GetString() ?? string.Empty;
            var conf = confProp.GetDouble();

            if (VisualColorTagNames.Contains(name) && conf > bestConf)
            {
                bestColor = name;
                bestConf  = conf;
            }
        }

        return bestConf >= 0.60 ? (bestColor, bestConf) : (null, 0.0);
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private static ExtractionResult Failed(string message) =>
        new(
            Success: false, ErrorMessage: message,
            Brand: null, MaterialType: null, Color: null,
            SpoolWeightGrams: null, PrintSettingsHints: null, BatchOrLot: null,
            Confidence: new ExtractionConfidence(
                Brand:              new FieldConfidence(0.0, null),
                MaterialType:       new FieldConfidence(0.0, null),
                Color:              new FieldConfidence(0.0, null),
                SpoolWeightGrams:   new FieldConfidence(0.0, null),
                PrintSettingsHints: new FieldConfidence(0.0, null),
                BatchOrLot:         new FieldConfidence(0.0, null)
            )
        );

    private static string Capitalize(string s) =>
        string.IsNullOrWhiteSpace(s) ? s : char.ToUpperInvariant(s[0]) + s[1..];
}

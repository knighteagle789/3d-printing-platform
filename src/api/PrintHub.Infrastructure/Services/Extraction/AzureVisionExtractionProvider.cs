using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.Infrastructure.Services.Extraction;

/// <summary>
/// Azure AI Vision-backed extraction provider.
/// This implementation uses OCR text extraction and lightweight parsing heuristics.
/// If endpoint/key are missing, returns a graceful provider failure.
/// </summary>
public class AzureVisionExtractionProvider : IExtractionProvider
{
    private static readonly Regex WeightRegex = new(@"(?<weight>\d{2,5})\s?(g|gram|grams|kg)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AzureVisionExtractionProvider> _logger;

    public AzureVisionExtractionProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AzureVisionExtractionProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ExtractionResult> ExtractAsync(ExtractionRequest request, CancellationToken cancellationToken = default)
    {
        var endpoint = _configuration["Intake:Extractor:AzureVision:Endpoint"];
        var apiKey = _configuration["Intake:Extractor:AzureVision:Key"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
        {
            return Failed("Azure Vision configuration is missing (Endpoint/Key).");
        }

        try
        {
            var readUrl = endpoint.TrimEnd('/') + "/vision/v3.2/read/analyze";
            using var req = new HttpRequestMessage(HttpMethod.Post, readUrl)
            {
                Content = JsonContent.Create(new { url = request.NormalizedPhotoUrl })
            };
            req.Headers.Add("Ocp-Apim-Subscription-Key", apiKey);

            using var start = await _httpClient.SendAsync(req, cancellationToken);
            if (!start.IsSuccessStatusCode)
            {
                var body = await start.Content.ReadAsStringAsync(cancellationToken);
                return Failed($"Azure Vision start read failed: {(int)start.StatusCode} {body}");
            }

            if (!start.Headers.TryGetValues("Operation-Location", out var opHeaders))
            {
                return Failed("Azure Vision did not return Operation-Location.");
            }

            var operationLocation = opHeaders.First();

            using var pollReq = new HttpRequestMessage(HttpMethod.Get, operationLocation);
            pollReq.Headers.Add("Ocp-Apim-Subscription-Key", apiKey);

            string status = "notStarted";
            string text = string.Empty;

            for (var i = 0; i < 10; i++)
            {
                using var pollResp = await _httpClient.SendAsync(pollReq, cancellationToken);
                var pollJson = await pollResp.Content.ReadAsStringAsync(cancellationToken);
                if (!pollResp.IsSuccessStatusCode)
                {
                    return Failed($"Azure Vision poll failed: {(int)pollResp.StatusCode} {pollJson}");
                }

                using var doc = JsonDocument.Parse(pollJson);
                status = doc.RootElement.GetProperty("status").GetString() ?? "unknown";

                if (string.Equals(status, "succeeded", StringComparison.OrdinalIgnoreCase))
                {
                    text = ExtractAllText(doc.RootElement);
                    break;
                }

                if (string.Equals(status, "failed", StringComparison.OrdinalIgnoreCase))
                {
                    return Failed("Azure Vision read operation failed.");
                }

                await Task.Delay(700, cancellationToken);
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                return Failed("No OCR text extracted from image.");
            }

            var lower = text.ToLowerInvariant();

            var materialType = new[] { "pla", "petg", "abs", "asa", "tpu", "nylon", "resin" }
                .FirstOrDefault(t => lower.Contains(t));

            var brand = new[] { "prusament", "hatchbox", "polymaker", "elegoo", "siraya" }
                .FirstOrDefault(b => lower.Contains(b));

            var weightMatch = WeightRegex.Match(lower);
            decimal? spoolWeight = null;
            if (weightMatch.Success && decimal.TryParse(weightMatch.Groups["weight"].Value, out var parsed))
            {
                spoolWeight = lower.Contains("kg") ? parsed * 1000m : parsed;
            }

            return new ExtractionResult(
                Success: true,
                ErrorMessage: null,
                Brand: brand is null ? null : Capitalize(brand),
                MaterialType: materialType?.ToUpperInvariant(),
                Color: null,
                SpoolWeightGrams: spoolWeight,
                PrintSettingsHints: null,
                BatchOrLot: null,
                Confidence: new ExtractionConfidence(
                    Brand:              new FieldConfidence(brand is null ? 0.0 : 0.7, brand),
                    MaterialType:       new FieldConfidence(materialType is null ? 0.0 : 0.78, materialType),
                    Color:              new FieldConfidence(0.0, null),
                    SpoolWeightGrams:   new FieldConfidence(spoolWeight.HasValue ? 0.76 : 0.0, weightMatch.Success ? weightMatch.Value : null),
                    PrintSettingsHints: new FieldConfidence(0.0, null),
                    BatchOrLot:         new FieldConfidence(0.0, null)
                )
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AzureVision extraction failed for intake {IntakeId}", request.IntakeId);
            return Failed(ex.Message);
        }
    }

    private static string ExtractAllText(JsonElement root)
    {
        if (!root.TryGetProperty("analyzeResult", out var analyzeResult)) return string.Empty;
        if (!analyzeResult.TryGetProperty("readResults", out var readResults)) return string.Empty;

        var lines = new List<string>();

        foreach (var page in readResults.EnumerateArray())
        {
            if (!page.TryGetProperty("lines", out var lineArray)) continue;
            foreach (var line in lineArray.EnumerateArray())
            {
                if (line.TryGetProperty("text", out var textProp))
                {
                    var lineText = textProp.GetString();
                    if (!string.IsNullOrWhiteSpace(lineText))
                    {
                        lines.Add(lineText);
                    }
                }
            }
        }

        return string.Join(" ", lines);
    }

    private static ExtractionResult Failed(string message) =>
        new(
            Success: false,
            ErrorMessage: message,
            Brand: null,
            MaterialType: null,
            Color: null,
            SpoolWeightGrams: null,
            PrintSettingsHints: null,
            BatchOrLot: null,
            Confidence: new ExtractionConfidence(
                Brand: new FieldConfidence(0.0, null),
                MaterialType: new FieldConfidence(0.0, null),
                Color: new FieldConfidence(0.0, null),
                SpoolWeightGrams: new FieldConfidence(0.0, null),
                PrintSettingsHints: new FieldConfidence(0.0, null),
                BatchOrLot: new FieldConfidence(0.0, null)
            )
        );

    private static string Capitalize(string s)
        => string.IsNullOrWhiteSpace(s) ? s : char.ToUpperInvariant(s[0]) + s[1..];
}

namespace PrintHub.Core.Interfaces.Services
{
    /// <summary>
    /// Abstraction over AI extraction providers (Azure AI Vision, Mock, etc.).
    /// Implementations are selected via Intake:Extractor:Provider configuration.
    ///
    /// Input:  normalized JPEG photo URL + intake context
    /// Output: structured draft fields with per-field confidence scores
    /// </summary>
    public interface IExtractionProvider
    {
        Task<ExtractionResult> ExtractAsync(ExtractionRequest request, CancellationToken cancellationToken = default);
    }

    public record ExtractionRequest(
        Guid IntakeId,
        string NormalizedPhotoUrl
    );

    public record ExtractionResult(
        bool Success,
        string? ErrorMessage,

        // Extracted field values (null = not found in image)
        string? Brand,
        string? MaterialType,
        string? Color,
        decimal? SpoolWeightGrams,
        string? PrintSettingsHints,     // raw JSON or hints string to be stored as-is
        string? BatchOrLot,

        // Per-field confidence scores (0.0 = not found/unknown, 1.0 = certain)
        ExtractionConfidence Confidence
    );

    /// <summary>
    /// Per-field confidence scores (0.0–1.0) and the source text snippet the AI used.
    /// </summary>
    public record ExtractionConfidence(
        FieldConfidence Brand,
        FieldConfidence MaterialType,
        FieldConfidence Color,
        FieldConfidence SpoolWeightGrams,
        FieldConfidence PrintSettingsHints,
        FieldConfidence BatchOrLot
    );

    public record FieldConfidence(
        double Score,
        string? SourceText
    );
}

using Microsoft.Extensions.Logging;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.Infrastructure.Services.Extraction
{
    /// <summary>
    /// Mock extraction provider for local development and unit testing.
    /// Returns deterministic sample data — no Azure dependency required.
    /// Activated when Intake:Extractor:Provider = "Mock" in configuration.
    /// </summary>
    public class MockExtractionProvider : IExtractionProvider
    {
        private readonly ILogger<MockExtractionProvider> _logger;

        public MockExtractionProvider(ILogger<MockExtractionProvider> logger)
        {
            _logger = logger;
        }

        public Task<ExtractionResult> ExtractAsync(ExtractionRequest request, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "[MockExtractor] Simulating extraction for intake {IntakeId}", request.IntakeId);

            // Simulate a short delay to mimic real async extraction
            var result = new ExtractionResult(
                Success: true,
                ErrorMessage: null,

                Brand: "Prusament",
                MaterialType: "PLA",
                Color: "Galaxy Black",
                SpoolWeightGrams: 1000m,
                PrintSettingsHints: """{"bedTemp":60,"nozzleTemp":215,"printSpeed":60}""",
                BatchOrLot: "MOCK-BATCH-001",

                Confidence: new ExtractionConfidence(
                    Brand:               new FieldConfidence(0.92, "Prusament"),
                    MaterialType:        new FieldConfidence(0.97, "PLA"),
                    Color:               new FieldConfidence(0.88, "Galaxy Black"),
                    SpoolWeightGrams:    new FieldConfidence(0.95, "1 kg / 1000 g"),
                    PrintSettingsHints:  new FieldConfidence(0.72, "215°C / 60°C bed"),
                    BatchOrLot:          new FieldConfidence(0.40, null)   // low confidence — will require review
                )
            );

            return Task.FromResult(result);
        }
    }
}

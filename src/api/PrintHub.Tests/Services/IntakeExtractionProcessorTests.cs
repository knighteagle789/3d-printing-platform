using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PrintHub.API.Services.Intake;
using PrintHub.Core.Common;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

/// <summary>
/// Unit tests for <see cref="IntakeExtractionProcessor"/>.
/// Verifies retry/dead-letter logic and happy-path state transitions
/// independent of the queue transport layer.
/// </summary>
public class IntakeExtractionProcessorTests
{
    private readonly Mock<IMaterialIntakeRepository> _repoMock       = new();
    private readonly Mock<IUnitOfWork>               _uowMock        = new();
    private readonly Mock<IExtractionProvider>       _providerMock   = new();
    private readonly Mock<IFileStorageService>        _fileStorageMock = new();

    private IntakeExtractionProcessor CreateSut(int maxRetries = 3)
    {
        _uowMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);
        _repoMock.Setup(r => r.AddEventAsync(It.IsAny<IntakeEvent>()))
                 .Returns(Task.CompletedTask);

        var options = Options.Create(new MaterialIntakeQueueOptions
        {
            Name                   = "test-queue",
            MaxRetries             = maxRetries,
            PollIntervalSeconds    = 5,
            VisibilityTimeoutSeconds = 30,
        });

        _fileStorageMock
            .Setup(s => s.GenerateSasUrlAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
            .ReturnsAsync((string blobName, TimeSpan _) => $"https://storage.example.com/{blobName}?sas=test");

        return new IntakeExtractionProcessor(
            _repoMock.Object,
            _uowMock.Object,
            _providerMock.Object,
            _fileStorageMock.Object,
            options,
            NullLogger<IntakeExtractionProcessor>.Instance);
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_SuccessfulExtraction_TransitionsToNeedsReviewAndReturnsSucceeded()
    {
        // Arrange
        var intake = TestDataBuilder.CreateMaterialIntake(
            status:              IntakeStatus.Extracting,
            draftMaterialType:   "PLA",
            draftColor:          "Black");
        intake.ExtractionAttemptCount = 0;

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var extractionResult = BuildSuccessResult("BrandX", "PLA", "Black");
        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(extractionResult);

        var sut = CreateSut(maxRetries: 3);

        // Act
        var outcome = await sut.ProcessAsync(intake.Id);

        // Assert
        outcome.Should().Be(ExtractionProcessingOutcome.Succeeded);
        intake.Status.Should().Be(IntakeStatus.NeedsReview);
        intake.ExtractionAttemptCount.Should().Be(1);
        intake.DraftBrand.Should().Be("BrandX");
        intake.DraftMaterialType.Should().Be("PLA");
        intake.DraftColor.Should().Be("Black");
        intake.LastExtractionError.Should().BeNull();
        intake.ExtractedAtUtc.Should().NotBeNull();

        _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Retry (attempts < MaxRetries) ─────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_ExtractionFails_BelowMaxRetries_ReturnsRetry()
    {
        // Arrange — first attempt (count starts at 0, becomes 1 after increment, MaxRetries = 3)
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Extracting);
        intake.ExtractionAttemptCount = 0;

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Vision API timeout"));

        var sut = CreateSut(maxRetries: 3);

        // Act
        var outcome = await sut.ProcessAsync(intake.Id);

        // Assert
        outcome.Should().Be(ExtractionProcessingOutcome.Retry);
        intake.Status.Should().Be(IntakeStatus.Extracting, "status must not change on a retryable failure");
        intake.ExtractionAttemptCount.Should().Be(1);
        intake.LastExtractionError.Should().Contain("Vision API timeout");

        _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessAsync_ExtractionFails_SecondAttemptStillBelowMax_ReturnsRetry()
    {
        // Arrange — second attempt (count starts at 1), MaxRetries = 3  → 2 < 3 → retry
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Extracting);
        intake.ExtractionAttemptCount = 1;

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Network error"));

        var sut = CreateSut(maxRetries: 3);

        // Act
        var outcome = await sut.ProcessAsync(intake.Id);

        // Assert
        outcome.Should().Be(ExtractionProcessingOutcome.Retry);
        intake.ExtractionAttemptCount.Should().Be(2);
    }

    // ── Dead-letter (attempts >= MaxRetries) ──────────────────────────────────

    [Fact]
    public async Task ProcessAsync_ExtractionFails_AtMaxRetries_ReturnsDeadLettered()
    {
        // Arrange — last attempt (count starts at MaxRetries-1 = 2), MaxRetries = 3
        // after increment: 3 >= 3 → dead-letter
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Extracting);
        intake.ExtractionAttemptCount = 2;

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Service unavailable"));

        var sut = CreateSut(maxRetries: 3);

        // Act
        var outcome = await sut.ProcessAsync(intake.Id);

        // Assert
        outcome.Should().Be(ExtractionProcessingOutcome.DeadLettered);
        intake.Status.Should().Be(IntakeStatus.Failed,
            "intake must be transitioned to Failed when max retries are exhausted");
        intake.ExtractionAttemptCount.Should().Be(3);
        intake.LastExtractionError.Should().Contain("Service unavailable");
        intake.ExtractedAtUtc.Should().NotBeNull();

        _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessAsync_ExtractionFails_BeyondMaxRetries_AlsoDeadLetters()
    {
        // Edge case: count already exceeds max (e.g., from a re-queued message with stale count)
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Extracting);
        intake.ExtractionAttemptCount = 5; // > MaxRetries = 3

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Still broken"));

        var sut = CreateSut(maxRetries: 3);

        var outcome = await sut.ProcessAsync(intake.Id);

        outcome.Should().Be(ExtractionProcessingOutcome.DeadLettered);
        intake.Status.Should().Be(IntakeStatus.Failed);
    }

    // ── Discard cases ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_IntakeNotFound_ReturnsDiscarded()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
                 .ReturnsAsync((MaterialIntake?)null);

        var sut = CreateSut();

        var outcome = await sut.ProcessAsync(Guid.NewGuid());

        outcome.Should().Be(ExtractionProcessingOutcome.Discarded);
        _uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(IntakeStatus.Approved)]
    [InlineData(IntakeStatus.Rejected)]
    public async Task ProcessAsync_TerminalIntake_ReturnsDiscarded(IntakeStatus terminalStatus)
    {
        var intake = TestDataBuilder.CreateMaterialIntake(status: terminalStatus);
        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var sut = CreateSut();

        var outcome = await sut.ProcessAsync(intake.Id);

        outcome.Should().Be(ExtractionProcessingOutcome.Discarded);
        _providerMock.Verify(p => p.ExtractAsync(
            It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Provider returns Success=false ────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_ProviderReturnsFailure_TreatsAsException_BelowMax_ReturnsRetry()
    {
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Extracting);
        intake.ExtractionAttemptCount = 0;

        _repoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var failureResult = new ExtractionResult(
            Success:      false,
            ErrorMessage: "Provider could not identify material.",
            Brand: null, MaterialType: null, Color: null,
            SpoolWeightGrams: null, PrintSettingsHints: null, BatchOrLot: null,
            Confidence: EmptyConfidence());

        _providerMock.Setup(p => p.ExtractAsync(
                It.IsAny<ExtractionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(failureResult);

        var sut = CreateSut(maxRetries: 3);

        var outcome = await sut.ProcessAsync(intake.Id);

        outcome.Should().Be(ExtractionProcessingOutcome.Retry);
        intake.LastExtractionError.Should().Contain("Provider could not identify material.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ExtractionResult BuildSuccessResult(
        string brand = "TestBrand",
        string type  = "PLA",
        string color = "White") =>
        new ExtractionResult(
            Success:           true,
            ErrorMessage:      null,
            Brand:             brand,
            MaterialType:      type,
            Color:             color,
            SpoolWeightGrams:  750m,
            PrintSettingsHints: "210°C nozzle",
            BatchOrLot:        null,
            Confidence:        new ExtractionConfidence(
                Brand:             new FieldConfidence(0.95, brand),
                MaterialType:      new FieldConfidence(0.98, type),
                Color:             new FieldConfidence(0.90, color),
                SpoolWeightGrams:  new FieldConfidence(0.80, "750g"),
                PrintSettingsHints:new FieldConfidence(0.70, "210"),
                BatchOrLot:        new FieldConfidence(0.0,  null)));

    private static ExtractionConfidence EmptyConfidence() =>
        new ExtractionConfidence(
            Brand:             new FieldConfidence(0, null),
            MaterialType:      new FieldConfidence(0, null),
            Color:             new FieldConfidence(0, null),
            SpoolWeightGrams:  new FieldConfidence(0, null),
            PrintSettingsHints:new FieldConfidence(0, null),
            BatchOrLot:        new FieldConfidence(0, null));
}
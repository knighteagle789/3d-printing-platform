using FluentAssertions;
using Moq;
using PrintHub.API.Services;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

public class MaterialIntakeServiceTests
{
    private readonly Mock<IMaterialIntakeRepository> _intakeRepoMock = new();
    private readonly Mock<IMaterialRepository> _materialRepoMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IIntakeExtractionQueue> _queueMock = new();
    private readonly MaterialIntakeService _sut;

    // Reusable test technology list
    private static readonly List<PrintingTechnology> DefaultTechnologies =
    [
        new PrintingTechnology { Id = Guid.NewGuid(), Name = "FDM", IsActive = true, CreatedAt = DateTime.UtcNow },
        new PrintingTechnology { Id = Guid.NewGuid(), Name = "SLA", IsActive = true, CreatedAt = DateTime.UtcNow },
    ];

    public MaterialIntakeServiceTests()
    {
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _intakeRepoMock.Setup(r => r.AddEventAsync(It.IsAny<IntakeEvent>())).Returns(Task.CompletedTask);
        _materialRepoMock.Setup(r => r.GetAllTechnologiesAsync())
            .ReturnsAsync((IReadOnlyList<PrintingTechnology>)DefaultTechnologies);

        _sut = new MaterialIntakeService(
            _intakeRepoMock.Object,
            _materialRepoMock.Object,
            _unitOfWorkMock.Object,
            _queueMock.Object);
    }

    // ── ApproveIntakeAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task ApproveIntake_NoDuplicate_CreatesNewMaterialAndReturnsCreated()
    {
        // Arrange
        var intake = TestDataBuilder.CreateMaterialIntake(
            status: IntakeStatus.NeedsReview,
            draftMaterialType: "PLA",
            draftColor: "Black");

        var actorId = Guid.NewGuid();
        var request = new ApproveIntakeRequest(
            CorrectedBrand: null,
            CorrectedMaterialType: null,
            CorrectedColor: null,
            CorrectedSpoolWeightGrams: null,
            CorrectedPrintSettingsHints: null,
            CorrectedBatchOrLot: null,
            PricePerSpool: 37.50m);

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _materialRepoMock
            .Setup(r => r.FindDuplicatesAsync(MaterialType.PLA, "Black", null))
            .ReturnsAsync((IReadOnlyList<Material>)[]);
        _materialRepoMock.Setup(r => r.AddAsync(It.IsAny<Material>()))
            .ReturnsAsync((Material m) => m);

        // Act
        var result = await _sut.ApproveIntakeAsync(intake.Id, request, actorId);

        // Assert
        result.Should().NotBeNull();
        result.Outcome.Should().Be(IntakeApprovalOutcome.Created);
        result.MaterialId.Should().NotBeEmpty();
        result.ActionedByUserId.Should().Be(actorId);

        intake.Status.Should().Be(IntakeStatus.Approved);
        intake.ApprovedMaterialId.Should().Be(result.MaterialId);
        intake.ApprovalOutcome.Should().Be(IntakeApprovalOutcome.Created);
        intake.ActionedByUserId.Should().Be(actorId);
        intake.ActionedAtUtc.Should().NotBeNull();

        _materialRepoMock.Verify(r => r.AddAsync(It.Is<Material>(m =>
            m.Type == MaterialType.PLA &&
            m.Color == "Black" &&
            m.PricePerGram == 0.05m)), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ApproveIntake_DuplicateDetected_ReturnsMergeReviewWithoutCreatingMaterial()
    {
        // Arrange
        var existingMaterial = TestDataBuilder.CreateMaterial(color: "Black");
        var intake = TestDataBuilder.CreateMaterialIntake(
            status: IntakeStatus.NeedsReview,
            draftMaterialType: "PLA",
            draftColor: "Black");

        var actorId = Guid.NewGuid();
        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerSpool: 37.50m);

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _materialRepoMock
            .Setup(r => r.FindDuplicatesAsync(MaterialType.PLA, "Black", null))
            .ReturnsAsync((IReadOnlyList<Material>)[existingMaterial]);

        // Act
        var result = await _sut.ApproveIntakeAsync(intake.Id, request, actorId);

        // Assert
        result.Outcome.Should().Be(IntakeApprovalOutcome.NeedsMergeReview);
        result.MaterialId.Should().Be(existingMaterial.Id);

        intake.Status.Should().Be(IntakeStatus.Approved);
        intake.ApprovedMaterialId.Should().Be(existingMaterial.Id);

        // No new material should have been created
        _materialRepoMock.Verify(r => r.AddAsync(It.IsAny<Material>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ApproveIntake_ReviewerCorrectionsOverrideDraftValues()
    {
        // Arrange
        var intake = TestDataBuilder.CreateMaterialIntake(
            status: IntakeStatus.NeedsReview,
            draftMaterialType: "PLA",
            draftColor: "Black",
            draftBrand: "OldBrand");

        var actorId = Guid.NewGuid();
        var request = new ApproveIntakeRequest(
            CorrectedBrand: "Prusament",
            CorrectedMaterialType: "PETG",
            CorrectedColor: "Silver",
            CorrectedSpoolWeightGrams: 1000m,
            CorrectedPrintSettingsHints: null,
            CorrectedBatchOrLot: "LOT-2026-001",
            PricePerSpool: 70.00m);

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);
        _materialRepoMock
            .Setup(r => r.FindDuplicatesAsync(MaterialType.PETG, "Silver", "Prusament"))
            .ReturnsAsync((IReadOnlyList<Material>)[]);
        _materialRepoMock.Setup(r => r.AddAsync(It.IsAny<Material>()))
            .ReturnsAsync((Material m) => m);

        // Act
        var result = await _sut.ApproveIntakeAsync(intake.Id, request, actorId);

        // Assert — material was built from corrected values, not draft values
        result.Outcome.Should().Be(IntakeApprovalOutcome.Created);
        _materialRepoMock.Verify(r => r.AddAsync(It.Is<Material>(m =>
            m.Type == MaterialType.PETG &&
            m.Color == "Silver" &&
            m.Brand == "Prusament" &&
            m.StockGrams == 1000m &&
            m.Notes == "LOT-2026-001" &&
            m.PricePerGram == 0.07m)), Times.Once);
    }

    [Fact]
    public async Task ApproveIntake_WrongState_ThrowsInvalidIntakeTransitionException()
    {
        // Arrange — intake is still in Uploaded state, not NeedsReview
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Uploaded);
        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerSpool: 37.50m);

        // Act & Assert
        var act = async () => await _sut.ApproveIntakeAsync(intake.Id, request, Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidIntakeTransitionException>();
    }

    [Fact]
    public async Task ApproveIntake_NotFound_ThrowsNotFoundException()
    {
        // Arrange
        _intakeRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((MaterialIntake?)null);

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerSpool: 37.50m);

        // Act & Assert
        var act = async () => await _sut.ApproveIntakeAsync(Guid.NewGuid(), request, Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ApproveIntake_InvalidMaterialType_ThrowsBusinessRuleException()
    {
        // Arrange — draft has a gibberish type that won't parse as MaterialType
        var intake = TestDataBuilder.CreateMaterialIntake(
            status: IntakeStatus.NeedsReview,
            draftMaterialType: "QuantumPlastic9000",
            draftColor: "Black");

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerSpool: 37.50m);

        // Act & Assert
        var act = async () => await _sut.ApproveIntakeAsync(intake.Id, request, Guid.NewGuid());
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*QuantumPlastic9000*");
    }

    [Fact]
    public async Task ApproveIntake_MissingColor_ThrowsBusinessRuleException()
    {
        // Arrange — no extracted color and no correction
        var intake = TestDataBuilder.CreateMaterialIntake(
            status: IntakeStatus.NeedsReview,
            draftMaterialType: "PLA",
            draftColor: "");   // blank extracted color

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerSpool: 37.50m);

        // Act & Assert
        var act = async () => await _sut.ApproveIntakeAsync(intake.Id, request, Guid.NewGuid());
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*color*");
    }

    // ── RejectIntakeAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task RejectIntake_ValidIntake_SetsRejectedStatusAndStampsAuditFields()
    {
        // Arrange
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.NeedsReview);
        var actorId = Guid.NewGuid();

        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        // Act
        await _sut.RejectIntakeAsync(intake.Id, new RejectIntakeRequest("Blurry image."), actorId);

        // Assert
        intake.Status.Should().Be(IntakeStatus.Rejected);
        intake.RejectionReason.Should().Be("Blurry image.");
        intake.ActionedByUserId.Should().Be(actorId);
        intake.ActionedAtUtc.Should().NotBeNull();

        _intakeRepoMock.Verify(r => r.AddEventAsync(It.Is<IntakeEvent>(e =>
            e.EventType == "intake.rejected" &&
            e.ToStatus == IntakeStatus.Rejected)), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RejectIntake_WrongState_ThrowsInvalidIntakeTransitionException()
    {
        // Arrange — can't reject from Uploaded (not yet reviewed)
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Uploaded);
        _intakeRepoMock.Setup(r => r.GetByIdAsync(intake.Id)).ReturnsAsync(intake);

        // Act & Assert
        var act = async () => await _sut.RejectIntakeAsync(
            intake.Id, new RejectIntakeRequest("Not applicable."), Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidIntakeTransitionException>();
    }

    [Fact]
    public async Task RejectIntake_NotFound_ThrowsNotFoundException()
    {
        // Arrange
        _intakeRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((MaterialIntake?)null);

        // Act & Assert
        var act = async () => await _sut.RejectIntakeAsync(
            Guid.NewGuid(), new RejectIntakeRequest("Some reason."), Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── GetIntakeQueueAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetIntakeQueue_NoFilters_ReturnsAllItems()
    {
        // Arrange
        var intakes = new List<MaterialIntake>
        {
            TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Uploaded),
            TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.NeedsReview),
            TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.Approved),
        };
        var filter = new IntakeQueueFilter();
        var pagedResult = new PagedResult<MaterialIntake>(intakes, intakes.Count, 1, 25);

        _intakeRepoMock.Setup(r => r.GetPagedAsync(filter)).ReturnsAsync(pagedResult);

        // Act
        var result = await _sut.GetIntakeQueueAsync(filter);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(3);
        result.TotalCount.Should().Be(3);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(25);
        _intakeRepoMock.Verify(r => r.GetPagedAsync(filter), Times.Once);
    }

    [Fact]
    public async Task GetIntakeQueue_StatusFilter_ForwardsFilterToRepository()
    {
        // Arrange
        var intake = TestDataBuilder.CreateMaterialIntake(status: IntakeStatus.NeedsReview);
        var filter = new IntakeQueueFilter(Status: IntakeStatus.NeedsReview);
        var pagedResult = new PagedResult<MaterialIntake>([intake], 1, 1, 25);

        _intakeRepoMock.Setup(r => r.GetPagedAsync(filter)).ReturnsAsync(pagedResult);

        // Act
        var result = await _sut.GetIntakeQueueAsync(filter);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items[0].Status.Should().Be(IntakeStatus.NeedsReview);
        _intakeRepoMock.Verify(r => r.GetPagedAsync(It.Is<IntakeQueueFilter>(f =>
            f.Status == IntakeStatus.NeedsReview)), Times.Once);
    }

    [Fact]
    public async Task GetIntakeQueue_EmptyResult_ReturnsPagesResponseWithZeroItems()
    {
        // Arrange
        var filter = new IntakeQueueFilter(SearchText: "nonexistent-brand-xyz");
        var pagedResult = new PagedResult<MaterialIntake>([], 0, 1, 25);

        _intakeRepoMock.Setup(r => r.GetPagedAsync(filter)).ReturnsAsync(pagedResult);

        // Act
        var result = await _sut.GetIntakeQueueAsync(filter);

        // Assert
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.TotalPages.Should().Be(0);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeFalse();
    }
}
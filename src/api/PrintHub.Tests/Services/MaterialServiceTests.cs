using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using PrintHub.API.Services;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

public class MaterialServiceTests
{
    private readonly Mock<IMaterialRepository> _materialRepoMock = new();
    private readonly Mock<IUnitOfWork>          _unitOfWorkMock   = new();
    private readonly Mock<ILogger<MaterialService>> _loggerMock   = new();
    private readonly MaterialService _sut;

    public MaterialServiceTests()
    {
        _sut = new MaterialService(
            _materialRepoMock.Object,
            _unitOfWorkMock.Object,
            _loggerMock.Object);
    }

    // ─── GetActiveMaterialsAsync ───────────────────────────────────────────

    [Fact]
    public async Task GetActiveMaterialsAsync_ReturnsMappedMaterials()
    {
        // Arrange
        var materials = new List<Material>
        {
            TestDataBuilder.CreateMaterial(color: "Black"),
            TestDataBuilder.CreateMaterial(color: "White"),
        };
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync(materials);

        // Act
        var result = await _sut.GetActiveMaterialsAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Select(r => r.Color).Should().BeEquivalentTo(["Black", "White"]);
    }

    [Fact]
    public async Task GetActiveMaterialsAsync_WhenNoneExist_ReturnsEmptyList()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([]);

        // Act
        var result = await _sut.GetActiveMaterialsAsync();

        // Assert
        result.Should().BeEmpty();
    }

    // ─── GetMaterialsByTypeAsync ───────────────────────────────────────────

    [Fact]
    public async Task GetMaterialsByTypeAsync_WithValidType_ReturnsFilteredMaterials()
    {
        // Arrange
        var pla   = TestDataBuilder.CreateMaterial(color: "Black"); // default type is PLA
        var petg  = TestDataBuilder.CreateMaterial(color: "Red");
        petg.Type = MaterialType.PETG;

        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([pla, petg]);

        // Act
        var result = await _sut.GetMaterialsByTypeAsync("PLA");

        // Assert
        result.Should().HaveCount(1);
        result[0].Color.Should().Be("Black");
    }

    [Fact]
    public async Task GetMaterialsByTypeAsync_IsCaseInsensitive()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial();
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([material]);

        // Act
        var result = await _sut.GetMaterialsByTypeAsync("pla");

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMaterialsByTypeAsync_WithInvalidType_ThrowsBusinessRuleException()
    {
        // Act
        var act = async () => await _sut.GetMaterialsByTypeAsync("NotAType");

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*NotAType*");
    }

    // ─── GetMaterialsByTechnologyAsync ────────────────────────────────────

    [Fact]
    public async Task GetMaterialsByTechnologyAsync_ReturnsOnlyMatchingTechnology()
    {
        // Arrange
        var techId = Guid.NewGuid();
        var match    = TestDataBuilder.CreateMaterial(color: "Black");
        match.PrintingTechnologyId = techId;
        var noMatch  = TestDataBuilder.CreateMaterial(color: "White");
        noMatch.PrintingTechnologyId = Guid.NewGuid();

        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([match, noMatch]);

        // Act
        var result = await _sut.GetMaterialsByTechnologyAsync(techId);

        // Assert
        result.Should().HaveCount(1);
        result[0].Color.Should().Be("Black");
    }

    [Fact]
    public async Task GetMaterialsByTechnologyAsync_WhenNoMatch_ReturnsEmptyList()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([TestDataBuilder.CreateMaterial()]);

        // Act
        var result = await _sut.GetMaterialsByTechnologyAsync(Guid.NewGuid());

        // Assert
        result.Should().BeEmpty();
    }

    // ─── SearchMaterialsAsync ─────────────────────────────────────────────

    [Fact]
    public async Task SearchMaterialsAsync_WithEmptyTerm_ReturnsAllActiveMaterials()
    {
        // Arrange
        var materials = new List<Material>
        {
            TestDataBuilder.CreateMaterial(color: "Black"),
            TestDataBuilder.CreateMaterial(color: "White"),
        };
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync(materials);

        // Act
        var result = await _sut.SearchMaterialsAsync("   ");

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task SearchMaterialsAsync_MatchesOnColor()
    {
        // Arrange
        var black = TestDataBuilder.CreateMaterial(color: "Black");
        var white = TestDataBuilder.CreateMaterial(color: "White");
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([black, white]);

        // Act
        var result = await _sut.SearchMaterialsAsync("blac");

        // Assert
        result.Should().HaveCount(1);
        result[0].Color.Should().Be("Black");
    }

    [Fact]
    public async Task SearchMaterialsAsync_MatchesOnType()
    {
        // Arrange
        var pla  = TestDataBuilder.CreateMaterial(color: "Black");   // PLA
        var petg = TestDataBuilder.CreateMaterial(color: "Red");
        petg.Type = MaterialType.PETG;
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([pla, petg]);

        // Act
        var result = await _sut.SearchMaterialsAsync("PETG");

        // Assert
        result.Should().HaveCount(1);
        result[0].Color.Should().Be("Red");
    }

    [Fact]
    public async Task SearchMaterialsAsync_MatchesOnDescription()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial();
        material.Description = "Great for detailed miniatures";
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([material]);

        // Act
        var result = await _sut.SearchMaterialsAsync("miniature");

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchMaterialsAsync_IsCaseInsensitive()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial(color: "Galaxy Black");
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([material]);

        // Act
        var result = await _sut.SearchMaterialsAsync("GALAXY");

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchMaterialsAsync_WithNoMatches_ReturnsEmptyList()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetActiveMaterialsAsync())
            .ReturnsAsync([TestDataBuilder.CreateMaterial(color: "Black")]);

        // Act
        var result = await _sut.SearchMaterialsAsync("zzznotfound");

        // Assert
        result.Should().BeEmpty();
    }

    // ─── GetMaterialByIdAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetMaterialByIdAsync_WithExistingMaterial_ReturnsMappedResponse()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial(color: "Blue");
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(material.Id))
            .ReturnsAsync(material);

        // Act
        var result = await _sut.GetMaterialByIdAsync(material.Id);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(material.Id);
        result.Color.Should().Be("Blue");
    }

    [Fact]
    public async Task GetMaterialByIdAsync_WithNonExistentId_ThrowsNotFoundException()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Material?)null);

        // Act
        var act = async () => await _sut.GetMaterialByIdAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ─── GetAllMaterialsAdminAsync ────────────────────────────────────────

    [Fact]
    public async Task GetAllMaterialsAdminAsync_IncludesInactiveMaterials()
    {
        // Arrange
        var active   = TestDataBuilder.CreateMaterial(isActive: true);
        var inactive = TestDataBuilder.CreateMaterial(isActive: false);
        _materialRepoMock.Setup(r => r.GetAllWithTechnologyAsync())
            .ReturnsAsync([active, inactive]);

        // Act
        var result = await _sut.GetAllMaterialsAdminAsync();

        // Assert
        result.Should().HaveCount(2);
    }

    // ─── GetMaterialByIdAdminAsync ────────────────────────────────────────

    [Fact]
    public async Task GetMaterialByIdAdminAsync_WithExistingMaterial_ReturnsMappedResponse()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial();
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(material.Id))
            .ReturnsAsync(material);

        // Act
        var result = await _sut.GetMaterialByIdAdminAsync(material.Id);

        // Assert
        result.Id.Should().Be(material.Id);
    }

    [Fact]
    public async Task GetMaterialByIdAdminAsync_WithNonExistentId_ThrowsNotFoundException()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Material?)null);

        // Act
        var act = async () => await _sut.GetMaterialByIdAdminAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ─── CreateMaterialAsync ──────────────────────────────────────────────

    [Fact]
    public async Task CreateMaterialAsync_WithValidRequest_PersistsAndReturnsMaterial()
    {
        // Arrange
        var request = new CreateMaterialRequest(
            Type: "PLA",
            Color: "Black",
            Finish: "Standard",
            Grade: "Standard",
            Description: null,
            Brand: "Prusament",
            PricePerGram: 0.05m,
            StockGrams: 1000m,
            LowStockThresholdGrams: null,
            Notes: null,
            PrintSettings: null,
            PrintingTechnologyId: null);

        var created = TestDataBuilder.CreateMaterial(color: "Black");
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(It.IsAny<Guid>()))
            .ReturnsAsync(created);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var result = await _sut.CreateMaterialAsync(request);

        // Assert
        result.Should().NotBeNull();
        _materialRepoMock.Verify(r => r.AddAsync(It.IsAny<Material>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task CreateMaterialAsync_WhenReloadFails_ThrowsNotFoundException()
    {
        // Arrange
        var request = new CreateMaterialRequest(
            Type: "PLA", Color: "Black", Finish: null, Grade: null,
            Description: null, Brand: null, PricePerGram: 0.05m,
            StockGrams: 1000m, LowStockThresholdGrams: null,
            Notes: null, PrintSettings: null, PrintingTechnologyId: null);

        // Reload after save returns null (shouldn't happen in prod, but guards the contract)
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Material?)null);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var act = async () => await _sut.CreateMaterialAsync(request);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ─── UpdateMaterialAsync ──────────────────────────────────────────────

    [Fact]
    public async Task UpdateMaterialAsync_WithExistingMaterial_AppliesChangesAndSaves()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial(color: "Black");
        var request  = new UpdateMaterialRequest(
            Type: null, Color: "Galaxy Black", Finish: null, Grade: null,
            Description: null, Brand: null, PricePerGram: null,
            StockGrams: null, LowStockThresholdGrams: null,
            Notes: null, PrintSettings: null, PrintingTechnologyId: null,
            IsActive: null);

        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(material.Id))
            .ReturnsAsync(material);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var result = await _sut.UpdateMaterialAsync(material.Id, request);

        // Assert
        result.Color.Should().Be("Galaxy Black");
        _materialRepoMock.Verify(r => r.Update(It.IsAny<Material>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateMaterialAsync_WithNonExistentId_ThrowsNotFoundException()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Material?)null);

        var request = new UpdateMaterialRequest(
            null, null, null, null, null, null, null, null, null, null, null, null, null);

        // Act
        var act = async () => await _sut.UpdateMaterialAsync(Guid.NewGuid(), request);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateMaterialAsync_SetsUpdatedAt()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial();
        material.UpdatedAt = null;

        _materialRepoMock.Setup(r => r.GetWithTechnologyAsync(material.Id))
            .ReturnsAsync(material);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        var request = new UpdateMaterialRequest(
            null, null, null, null, null, null, null, null, null, null, null, null, null);

        // Act
        await _sut.UpdateMaterialAsync(material.Id, request);

        // Assert
        material.UpdatedAt.Should().NotBeNull();
        material.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    // ─── DeleteMaterialAsync ──────────────────────────────────────────────

    [Fact]
    public async Task DeleteMaterialAsync_SoftDeletesAndSaves()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial(isActive: true);
        _materialRepoMock.Setup(r => r.GetByIdAsync(material.Id))
            .ReturnsAsync(material);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.DeleteMaterialAsync(material.Id);

        // Assert
        material.IsActive.Should().BeFalse();
        material.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        _materialRepoMock.Verify(r => r.Update(It.IsAny<Material>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task DeleteMaterialAsync_NeverHardDeletes()
    {
        // Arrange
        var material = TestDataBuilder.CreateMaterial(isActive: true);
        _materialRepoMock.Setup(r => r.GetByIdAsync(material.Id))
            .ReturnsAsync(material);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.DeleteMaterialAsync(material.Id);

        // Assert — Delete(entity) should never be called, only Update for the soft-delete flag
        _materialRepoMock.Verify(r => r.Delete(It.IsAny<Material>()), Times.Never);
    }

    [Fact]
    public async Task DeleteMaterialAsync_WithNonExistentId_ThrowsNotFoundException()
    {
        // Arrange
        _materialRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Material?)null);

        // Act
        var act = async () => await _sut.DeleteMaterialAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
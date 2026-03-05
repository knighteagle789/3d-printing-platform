using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using PrintHub.API.Services;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

public class QuoteServiceTests
{
    private readonly Mock<IQuoteRepository> _quoteRepoMock = new();
    private readonly Mock<IOrderRepository> _orderRepoMock = new();
    private readonly Mock<IMaterialRepository> _materialRepoMock = new();
    private readonly Mock<IFileRepository> _fileRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();
    private readonly Mock<ILogger<QuoteService>> _loggerMock = new();
    private readonly QuoteService _sut;

    public QuoteServiceTests()
    {
        _sut = new QuoteService(
            _quoteRepoMock.Object,
            _orderRepoMock.Object,
            _materialRepoMock.Object,
            _fileRepoMock.Object,
            _emailServiceMock.Object,
            _userRepoMock.Object,
            _unitOfWorkMock.Object,
            _loggerMock.Object);
    }

    // --- GetQuoteByIdAsync ---

    [Fact]
    public async Task GetQuoteByIdAsync_WithExistingQuote_ReturnsQuote()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var quote = TestDataBuilder.CreateQuoteRequest(userId: user.Id);
        quote.User = user;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var result = await _sut.GetQuoteByIdAsync(quote.Id);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(quote.Id);
        result.RequestNumber.Should().Be(quote.RequestNumber);
    }

    [Fact]
    public async Task GetQuoteByIdAsync_WithNonExistentQuote_ThrowsNotFoundException()
    {
        // Arrange
        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(It.IsAny<Guid>()))
            .ReturnsAsync((QuoteRequest?)null);

        // Act
        var act = async () => await _sut.GetQuoteByIdAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // --- AcceptQuoteResponseAsync ---

    [Fact]
    public async Task AcceptQuoteResponseAsync_WithValidResponse_AcceptsQuote()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var response = TestDataBuilder.CreateQuoteResponse();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.QuoteProvided);
        quote.User = user;
        quote.Responses.Add(response);
        response.QuoteRequestId = quote.Id;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var result = await _sut.AcceptQuoteResponseAsync(quote.Id, response.Id, user.Id);

        // Assert
        result.Should().NotBeNull();
        quote.Status.Should().Be(QuoteStatus.Accepted);
        response.IsAccepted.Should().BeTrue();
        response.AcceptedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task AcceptQuoteResponseAsync_WithWrongUser_ThrowsForbiddenException()
    {
        // Arrange
        var quoteOwner = TestDataBuilder.CreateUser();
        var otherUser = TestDataBuilder.CreateUser();
        var response = TestDataBuilder.CreateQuoteResponse();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: quoteOwner.Id, status: QuoteStatus.QuoteProvided);
        quote.User = quoteOwner;
        quote.Responses.Add(response);

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () =>
            await _sut.AcceptQuoteResponseAsync(quote.Id, response.Id, otherUser.Id);

        // Assert
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task AcceptQuoteResponseAsync_WhenAlreadyAccepted_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var response = TestDataBuilder.CreateQuoteResponse();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.Accepted);
        quote.User = user;
        quote.Responses.Add(response);

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () =>
            await _sut.AcceptQuoteResponseAsync(quote.Id, response.Id, user.Id);

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*already been accepted*");
    }

    [Fact]
    public async Task AcceptQuoteResponseAsync_WithExpiredResponse_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var response = TestDataBuilder.CreateQuoteResponse();
        response.ExpiresAt = DateTime.UtcNow.AddDays(-1); // Expired
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.QuoteProvided);
        quote.User = user;
        quote.Responses.Add(response);

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () =>
            await _sut.AcceptQuoteResponseAsync(quote.Id, response.Id, user.Id);

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*expired*");
    }

    [Fact]
    public async Task AcceptQuoteResponseAsync_WithNonExistentResponse_ThrowsNotFoundException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.QuoteProvided);
        quote.User = user;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () =>
            await _sut.AcceptQuoteResponseAsync(quote.Id, Guid.NewGuid(), user.Id);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // --- ConvertToOrderAsync ---

    [Fact]
    public async Task ConvertToOrderAsync_WithValidAcceptedQuote_CreatesOrder()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var material = TestDataBuilder.CreateMaterial();
        var file = TestDataBuilder.CreateFile(userId: user.Id);
        var response = TestDataBuilder.CreateQuoteResponse(isAccepted: true);
        response.RecommendedMaterialId = material.Id;

        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id,
            status: QuoteStatus.Accepted,
            fileId: file.Id,
            materialId: material.Id);
        quote.User = user;
        quote.Responses.Add(response);
        response.QuoteRequestId = quote.Id;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);
        _materialRepoMock.Setup(r => r.GetByIdAsync(material.Id))
            .ReturnsAsync(material);
        _fileRepoMock.Setup(r => r.GetFileWithAnalysisAsync(file.Id))
            .ReturnsAsync(file);
        _orderRepoMock.Setup(r => r.CountAsync()).ReturnsAsync(0);
        _orderRepoMock.Setup(r => r.AddAsync(It.IsAny<Order>()))
            .ReturnsAsync(It.IsAny<Order>());

        var createdOrder = TestDataBuilder.CreateOrder(
            userId: user.Id, status: OrderStatus.Submitted);
        createdOrder.User = user;
        createdOrder.Items = new List<OrderItem>();
        createdOrder.StatusHistory = new List<OrderStatusHistory>();

        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(It.IsAny<Guid>()))
            .ReturnsAsync(createdOrder);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var result = await _sut.ConvertToOrderAsync(quote.Id, user.Id);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("Submitted");
        _orderRepoMock.Verify(r => r.AddAsync(It.IsAny<Order>()), Times.Once);
        quote.OrderId.Should().NotBeNull();
    }

    [Fact]
    public async Task ConvertToOrderAsync_WhenNotAccepted_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.Pending);
        quote.User = user;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () => await _sut.ConvertToOrderAsync(quote.Id, user.Id);

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*accepted quotes*");
    }

    [Fact]
    public async Task ConvertToOrderAsync_WhenAlreadyConverted_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: user.Id, status: QuoteStatus.Accepted);
        quote.User = user;
        quote.OrderId = Guid.NewGuid(); // Already converted

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () => await _sut.ConvertToOrderAsync(quote.Id, user.Id);

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*already been converted*");
    }

    [Fact]
    public async Task ConvertToOrderAsync_WithWrongUser_ThrowsForbiddenException()
    {
        // Arrange
        var owner = TestDataBuilder.CreateUser();
        var otherUser = TestDataBuilder.CreateUser();
        var quote = TestDataBuilder.CreateQuoteRequest(
            userId: owner.Id, status: QuoteStatus.Accepted);
        quote.User = owner;

        _quoteRepoMock.Setup(r => r.GetQuoteWithResponsesAsync(quote.Id))
            .ReturnsAsync(quote);

        // Act
        var act = async () => await _sut.ConvertToOrderAsync(quote.Id, otherUser.Id);

        // Assert
        await act.Should().ThrowAsync<ForbiddenException>();
    }
}
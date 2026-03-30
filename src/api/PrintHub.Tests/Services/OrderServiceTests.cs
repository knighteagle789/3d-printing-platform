using Castle.Core.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PrintHub.API.Services;
using PrintHub.Core.DTOs.Orders;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

public class OrderServiceTests
{
    private readonly Mock<IOrderRepository> _orderRepoMock = new();
    private readonly Mock<IMaterialRepository> _materialRepoMock = new();
    private readonly Mock<IFileRepository> _fileRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();
    private readonly Mock<ILogger<OrderService>> _loggerMock = new();
    private readonly OrderService _sut;

    private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Pricing:MachineRatePerHour"] = "3.50"
        })
        .Build();

    public OrderServiceTests()
    {
        _sut = new OrderService(
            _orderRepoMock.Object,
            _materialRepoMock.Object,
            _fileRepoMock.Object,
            _emailServiceMock.Object,
            _userRepoMock.Object,
            _unitOfWorkMock.Object,
            _configuration,
            _loggerMock.Object);
    }

    // --- GetOrderByIdAsync ---

    [Fact]
    public async Task GetOrderByIdAsync_WithExistingOrder_ReturnsOrder()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder();
        order.User = TestDataBuilder.CreateUser();
        order.Items = new List<OrderItem>();
        order.StatusHistory = new List<OrderStatusHistory>();

        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(order.Id))
            .ReturnsAsync(order);

        // Act
        var result = await _sut.GetOrderByIdAsync(order.Id);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(order.Id);
        result.OrderNumber.Should().Be(order.OrderNumber);
    }

    [Fact]
    public async Task GetOrderByIdAsync_WithNonExistentOrder_ThrowsNotFoundException()
    {
        // Arrange
        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Order?)null);

        // Act
        var act = async () => await _sut.GetOrderByIdAsync(Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // --- UpdateOrderStatusAsync ---

    [Fact]
    public async Task UpdateOrderStatusAsync_WithValidTransition_UpdatesStatus()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder(status: OrderStatus.Submitted);
        var updatedOrder = TestDataBuilder.CreateOrder(id: order.Id, status: OrderStatus.InReview);
        updatedOrder.User = TestDataBuilder.CreateUser();
        updatedOrder.Items = new List<OrderItem>();
        updatedOrder.StatusHistory = new List<OrderStatusHistory>();

        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(order.Id))
            .ReturnsAsync(updatedOrder);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        var result = await _sut.UpdateOrderStatusAsync(
            order.Id, "InReview", Guid.NewGuid());

        // Assert
        result.Should().NotBeNull();
        _orderRepoMock.Verify(r => r.Update(It.IsAny<Order>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WithInvalidTransition_ThrowsBusinessRuleException()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder(status: OrderStatus.Draft);
        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);

        // Act — Draft cannot go directly to Printing
        var act = async () =>
            await _sut.UpdateOrderStatusAsync(order.Id, "Printing", Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Cannot transition*");
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WithInvalidStatusString_ThrowsBusinessRuleException()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder();
        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);

        // Act
        var act = async () =>
            await _sut.UpdateOrderStatusAsync(order.Id, "NotAStatus", Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Invalid status for order update*");
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WithNonExistentOrder_ThrowsNotFoundException()
    {
        // Arrange
        _orderRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Order?)null);

        // Act
        var act = async () =>
            await _sut.UpdateOrderStatusAsync(Guid.NewGuid(), "InReview", Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenShipped_SetsShippedAt()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder(status: OrderStatus.Packaging);
        var updatedOrder = TestDataBuilder.CreateOrder(
            id: order.Id, status: OrderStatus.Shipped);
        updatedOrder.User = TestDataBuilder.CreateUser();
        updatedOrder.Items = new List<OrderItem>();
        updatedOrder.StatusHistory = new List<OrderStatusHistory>();

        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(order.Id))
            .ReturnsAsync(updatedOrder);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.UpdateOrderStatusAsync(order.Id, "Shipped", Guid.NewGuid());

        // Assert
        order.ShippedAt.Should().NotBeNull();
        order.ShippedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenCompleted_SetsCompletedAt()
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder(status: OrderStatus.Delivered);
        var updatedOrder = TestDataBuilder.CreateOrder(
            id: order.Id, status: OrderStatus.Completed);
        updatedOrder.User = TestDataBuilder.CreateUser();
        updatedOrder.Items = new List<OrderItem>();
        updatedOrder.StatusHistory = new List<OrderStatusHistory>();

        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);
        _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(order.Id))
            .ReturnsAsync(updatedOrder);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.UpdateOrderStatusAsync(order.Id, "Completed", Guid.NewGuid());

        // Assert
        order.CompletedAt.Should().NotBeNull();
        order.CompletedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    // --- Status transition matrix ---

    [Theory]
    [InlineData(OrderStatus.Draft, "Submitted", true)]
    [InlineData(OrderStatus.Draft, "Cancelled", true)]
    [InlineData(OrderStatus.Draft, "Printing", false)]
    [InlineData(OrderStatus.Submitted, "InReview", true)]
    [InlineData(OrderStatus.Submitted, "Approved", false)]
    [InlineData(OrderStatus.Approved, "InProduction", true)]
    [InlineData(OrderStatus.Approved, "Shipped", false)]
    [InlineData(OrderStatus.Printing, "PostProcessing", true)]
    [InlineData(OrderStatus.Printing, "Completed", false)]
    [InlineData(OrderStatus.Shipped, "Delivered", true)]
    [InlineData(OrderStatus.Shipped, "Completed", false)]
    public async Task UpdateOrderStatusAsync_StatusTransitionMatrix(
        OrderStatus currentStatus, string newStatus, bool shouldSucceed)
    {
        // Arrange
        var order = TestDataBuilder.CreateOrder(status: currentStatus);
        _orderRepoMock.Setup(r => r.GetByIdAsync(order.Id)).ReturnsAsync(order);

        if (shouldSucceed)
        {
            var updatedOrder = TestDataBuilder.CreateOrder(id: order.Id);
            updatedOrder.User = TestDataBuilder.CreateUser();
            updatedOrder.Items = new List<OrderItem>();
            updatedOrder.StatusHistory = new List<OrderStatusHistory>();
            _orderRepoMock.Setup(r => r.GetOrderWithDetailsAsync(order.Id))
                .ReturnsAsync(updatedOrder);
            _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);
        }

        // Act
        var act = async () =>
            await _sut.UpdateOrderStatusAsync(order.Id, newStatus, Guid.NewGuid());

        // Assert
        if (shouldSucceed)
            await act.Should().NotThrowAsync();
        else
            await act.Should().ThrowAsync<BusinessRuleException>();
    }
}
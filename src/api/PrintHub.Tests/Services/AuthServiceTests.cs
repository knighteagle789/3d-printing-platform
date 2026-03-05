using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PrintHub.API.Services;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Tests.Helpers;

namespace PrintHub.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();
    private readonly Mock<ILogger<AuthService>> _loggerMock = new();
    private readonly IConfiguration _configuration;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var configValues = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "super-secret-test-key-that-is-long-enough-for-hmac",
            ["Jwt:Issuer"] = "https://test.printhub.com",
            ["Jwt:Audience"] = "https://test.printhub.com",
            ["Jwt:ExpirationHours"] = "24"
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();

        _sut = new AuthService(
            _userRepoMock.Object,
            _unitOfWorkMock.Object,
            _configuration,
            _emailServiceMock.Object,
            _loggerMock.Object);
    }

    // --- RegisterAsync ---

    [Fact]
    public async Task RegisterAsync_WithNewEmail_ReturnsAuthResponse()
    {
        // Arrange
        var request = new RegisterRequest(
            "john@example.com", "Password123!", "John", "Smith", null, null);

        _userRepoMock.Setup(r => r.EmailExistsAsync(request.Email))
            .ReturnsAsync(false);
        _userRepoMock.Setup(r => r.AddAsync(It.IsAny<User>()))
            .ReturnsAsync(It.IsAny<User>());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync())
            .ReturnsAsync(1);

        // Act
        var result = await _sut.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().NotBeNullOrEmpty();
        result.User.Email.Should().Be(request.Email);
        result.User.FirstName.Should().Be(request.FirstName);
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ThrowsConflictException()
    {
        // Arrange
        var request = new RegisterRequest(
            "existing@example.com", "Password123!", "John", "Smith", null, null);

        _userRepoMock.Setup(r => r.EmailExistsAsync(request.Email))
            .ReturnsAsync(true);

        // Act
        var act = async () => await _sut.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*already registered*");
    }

    [Fact]
    public async Task RegisterAsync_AssignsCustomerRoleByDefault()
    {
        // Arrange
        var request = new RegisterRequest(
            "new@example.com", "Password123!", "Jane", "Doe", null, null);

        User? capturedUser = null;
        _userRepoMock.Setup(r => r.EmailExistsAsync(request.Email))
            .ReturnsAsync(false);
        _userRepoMock.Setup(r => r.AddAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync(It.IsAny<User>());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.RegisterAsync(request);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.UserRoles.Should().ContainSingle(r => r.Role == Role.Customer);
    }

    [Fact]
    public async Task RegisterAsync_SendsWelcomeEmail()
    {
        // Arrange
        var request = new RegisterRequest(
            "new@example.com", "Password123!", "Jane", "Doe", null, null);

        _userRepoMock.Setup(r => r.EmailExistsAsync(request.Email)).ReturnsAsync(false);
        _userRepoMock.Setup(r => r.AddAsync(It.IsAny<User>())).ReturnsAsync(It.IsAny<User>());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Act
        await _sut.RegisterAsync(request);

        // Allow fire-and-forget to complete
        await Task.Delay(100);

        // Assert
        _emailServiceMock.Verify(e =>
            e.SendWelcomeEmailAsync(request.Email, request.FirstName),
            Times.Once);
    }

    // --- LoginAsync ---

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser(email: "john@example.com");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

        _userRepoMock.Setup(r => r.GetByEmailAsync(user.Email))
            .ReturnsAsync(user);
        _userRepoMock.Setup(r => r.GetWithRolesAsync(user.Id))
            .ReturnsAsync(user);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        var request = new LoginRequest(user.Email, "Password123!");

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrEmpty();
        result.User.Email.Should().Be(user.Email);
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ReturnsNull()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword!");

        _userRepoMock.Setup(r => r.GetByEmailAsync(user.Email))
            .ReturnsAsync(user);

        var request = new LoginRequest(user.Email, "WrongPassword!");

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithNonExistentEmail_ReturnsNull()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.LoginAsync(new LoginRequest("nobody@example.com", "pass"));

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithDeactivatedAccount_ReturnsNull()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser(isActive: false);
        _userRepoMock.Setup(r => r.GetByEmailAsync(user.Email))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.LoginAsync(new LoginRequest(user.Email, "Password123!"));

        // Assert
        result.Should().BeNull();
    }

    // --- ChangePasswordAsync ---

    [Fact]
    public async Task ChangePasswordAsync_WithCorrectCurrentPassword_Succeeds()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPassword!");

        _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        var request = new ChangePasswordRequest("OldPassword!", "NewPassword123!");

        // Act
        await _sut.ChangePasswordAsync(user.Id, request);

        // Assert
        BCrypt.Net.BCrypt.Verify("NewPassword123!", user.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task ChangePasswordAsync_WithWrongCurrentPassword_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword!");

        _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);

        // Act
        var act = async () =>
            await _sut.ChangePasswordAsync(user.Id,
                new ChangePasswordRequest("WrongPassword!", "NewPassword123!"));

        // Assert
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*incorrect*");
    }

    // --- UpdateUserAsync ---

    [Fact]
    public async Task UpdateUserAsync_WithValidData_UpdatesFields()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser();
        _userRepoMock.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        _userRepoMock.Setup(r => r.GetWithRolesAsync(user.Id)).ReturnsAsync(user);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        var request = new UpdateUserRequest("UpdatedFirst", "UpdatedLast", "555-1234", "ACME Corp");

        // Act
        var result = await _sut.UpdateUserAsync(user.Id, request);

        // Assert
        result.FirstName.Should().Be("UpdatedFirst");
        result.LastName.Should().Be("UpdatedLast");
    }

    [Fact]
    public async Task UpdateUserAsync_WithNonExistentUser_ThrowsNotFoundException()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () =>
            await _sut.UpdateUserAsync(Guid.NewGuid(),
                new UpdateUserRequest(null, null, null, null));

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
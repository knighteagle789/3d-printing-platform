using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PrintHub.Core.DTOs.Users;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _logger = logger;
    }

    // --- Authentication ---

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check for existing email
        if (await _userRepo.EmailExistsAsync(request.Email))
        {
            throw new ConflictException("Email is already registered.");
        }

        // Create user entity
        var user = request.ToEntity();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Add default customer role
        user.UserRoles.Add(new UserRole
        {
            Id = Guid.NewGuid(),
            Role = Role.Customer,
            AssignedAt = DateTime.UtcNow
        });

        await _userRepo.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("New user registered: {Email}", user.Email);

        // Generate token and return
        var token = GenerateJwtToken(user);
        var userResponse = UserResponse.FromEntity(user);

        return new AuthResponse(
            Token: token.Token,
            ExpiresAt: token.ExpiresAt,
            User: userResponse
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // Find user by email
        var user = await _userRepo.GetByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("Login attempt for non-existent email: {Email}", request.Email);
            return null;
        }

        // Check if account is active
        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt for deactivated account: {Email}", request.Email);
            return null;
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for: {Email}", request.Email);
            return null;
        }

        // Load roles for the token
        var userWithRoles = await _userRepo.GetWithRolesAsync(user.Id);

        // Update last login timestamp
        userWithRoles!.LastLoginAt = DateTime.UtcNow;
        _userRepo.Update(userWithRoles);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("User logged in: {Email}", user.Email);

        // Generate token and return
        var token = GenerateJwtToken(userWithRoles);
        var userResponse = UserResponse.FromEntity(userWithRoles);

        return new AuthResponse(
            Token: token.Token,
            ExpiresAt: token.ExpiresAt,
            User: userResponse
        );
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string token)
    {
        // Validate the existing token (even if expired) to extract user ID
        var principal = ValidateExpiredToken(token);
        if (principal == null)
            return null;

        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return null;

        var user = await _userRepo.GetWithRolesAsync(userId);
        if (user == null || !user.IsActive)
            return null;

        var newToken = GenerateJwtToken(user);
        var userResponse = UserResponse.FromEntity(user);

        return new AuthResponse(
            Token: newToken.Token,
            ExpiresAt: newToken.ExpiresAt,
            User: userResponse
        );
    }

    // --- User management ---

    public async Task<UserResponse?> GetUserByIdAsync(Guid id)
    {
        var user = await _userRepo.GetWithRolesAsync(id);
        return user != null ? UserResponse.FromEntity(user) : null;
    }

    public async Task<UserResponse?> GetUserByEmailAsync(string email)
    {
        var user = await _userRepo.GetByEmailAsync(email);
        if (user == null) return null;

        // GetByEmailAsync doesn't include roles, so reload
        var userWithRoles = await _userRepo.GetWithRolesAsync(user.Id);
        return UserResponse.FromEntity(userWithRoles!);
    }

    public async Task<UserResponse?> UpdateUserAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null) return null;

        if (request.FirstName is not null)
            user.FirstName = request.FirstName.Trim();

        if (request.LastName is not null)
            user.LastName = request.LastName.Trim();

        if (request.PhoneNumber is not null)
            user.PhoneNumber = request.PhoneNumber.Trim();

        if (request.CompanyName is not null)
            user.CompanyName = request.CompanyName.Trim();

        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("User profile updated: {UserId}", id);

        var updated = await _userRepo.GetWithRolesAsync(id);
        return UserResponse.FromEntity(updated!);
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null)
            return false;

        // Verify current password
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Failed password change attempt for user: {UserId}", userId);
            return false;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Password changed for user: {UserId}", userId);
        return true;
    }

    public async Task<bool> DeactivateUserAsync(Guid id)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null)
            return false;

        user.IsActive = false;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("User deactivated: {UserId}", id);
        return true;
    }

    // --- Private helpers ---

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddHours(
            double.Parse(_configuration["Jwt:ExpirationHours"] ?? "24"));

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.GivenName, user.FirstName),
            new(ClaimTypes.Surname, user.LastName)
        };

        // Add role claims
        foreach (var userRole in user.UserRoles)
        {
            claims.Add(new Claim(ClaimTypes.Role, userRole.Role.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    private ClaimsPrincipal? ValidateExpiredToken(string token)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = false,  // Allow expired tokens for refresh
            ValidIssuer = _configuration["Jwt:Issuer"],
            ValidAudience = _configuration["Jwt:Audience"],
            IssuerSigningKey = key
        };

        try
        {
            var principal = new JwtSecurityTokenHandler()
                .ValidateToken(token, tokenValidationParameters, out var securityToken);

            if (securityToken is not JwtSecurityToken jwtToken ||
                !jwtToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256,
                    StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }
}
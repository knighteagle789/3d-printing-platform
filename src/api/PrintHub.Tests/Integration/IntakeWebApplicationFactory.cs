using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Moq;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces.Services;
using PrintHub.Infrastructure.Data;

namespace PrintHub.Tests.Integration;

/// <summary>
/// Custom WebApplicationFactory that configures a test-friendly host:
/// - "Testing" environment (skips DB migration in Program.cs)
/// - In-memory EF database
/// - Mocked IMaterialIntakeService, IFileStorageService, IIntakeExtractionQueue
/// - Background worker removed
/// - JWT configured with a known test key
/// </summary>
public class IntakeWebApplicationFactory : WebApplicationFactory<Program>
{
    internal const string TestJwtKey    = "TestSecretKeyForIntegrationTests32CharsMin!";
    internal const string TestIssuer    = "PrintHub.Tests";
    internal const string TestAudience  = "PrintHub.Tests";

    public Mock<IMaterialIntakeService> IntakeServiceMock { get; } = new(MockBehavior.Strict);
    public Mock<IFileStorageService>    StorageServiceMock { get; } = new(MockBehavior.Strict);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]               = TestJwtKey,
                ["Jwt:Issuer"]            = TestIssuer,
                ["Jwt:Audience"]          = TestAudience,
                ["Jwt:ExpirationHours"]   = "1",
                // Azurite-style connection string — not actually used (storage is mocked)
                ["BlobStorage:ConnectionString"] = "UseDevelopmentStorage=true",
                ["BlobStorage:ContainerName"]    = "3d-models",
                // Disable Serilog sinks for tests
                ["Serilog:MinimumLevel:Default"] = "Warning",
            });
        });

        builder.ConfigureServices(services =>
        {
            // ── Replace EF Core DB with in-memory ─────────────────────────────
            var dbDescriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>)
                         || d.ServiceType == typeof(ApplicationDbContext))
                .ToList();
            foreach (var d in dbDescriptors) services.Remove(d);

            services.AddDbContext<ApplicationDbContext>(opts =>
                opts.UseInMemoryDatabase("IntakeTestDb_" + Guid.NewGuid()));

            // ── Remove real background worker ─────────────────────────────────
            var workerDescriptor = services.FirstOrDefault(d =>
                d.ImplementationType?.Name == "MaterialIntakeExtractionWorker");
            if (workerDescriptor is not null) services.Remove(workerDescriptor);

            // ── Replace singleton queue (registered in DependencyInjection) ───
            var queueDescriptor = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IIntakeExtractionQueue));
            if (queueDescriptor is not null) services.Remove(queueDescriptor);
            services.AddSingleton<IIntakeExtractionQueue>(new Mock<IIntakeExtractionQueue>().Object);

            // ── Replace IMaterialIntakeService ────────────────────────────────
            var svcDescriptor = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IMaterialIntakeService));
            if (svcDescriptor is not null) services.Remove(svcDescriptor);
            services.AddScoped<IMaterialIntakeService>(_ => IntakeServiceMock.Object);

            // ── Replace IFileStorageService ───────────────────────────────────
            var storageDescriptor = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IFileStorageService));
            if (storageDescriptor is not null) services.Remove(storageDescriptor);
            services.AddSingleton<IFileStorageService>(StorageServiceMock.Object);
        });
    }

    // ── JWT token helpers ─────────────────────────────────────────────────────

    /// <summary>Generates a signed JWT for a user with the given role.</summary>
    public string GenerateToken(Guid userId, Role role = Role.Staff)
    {
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtKey));
        var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             TestIssuer,
            audience:           TestAudience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Creates an HttpClient with an Authorization Bearer token for the given user/role.</summary>
    public HttpClient CreateAuthenticatedClient(Guid? userId = null, Role role = Role.Staff)
    {
        var uid    = userId ?? Guid.NewGuid();
        var token  = GenerateToken(uid, role);
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // ── Shared response factories ─────────────────────────────────────────────

    internal static MaterialIntakeResponse BuildIntakeResponse(
        Guid? id          = null,
        IntakeStatus status = IntakeStatus.NeedsReview,
        Guid? uploaderId  = null)
    {
        return new MaterialIntakeResponse(
            Id:                     id ?? Guid.NewGuid(),
            Status:                 status,
            SourceType:             IntakeSourceType.FileUpload,
            PhotoUrl:               "https://test.blob/material-intake/photo.jpg",
            UploadNotes:            null,
            ExtractionAttemptCount: 0,
            LastExtractionError:    null,
            ExtractedAtUtc:         null,
            DraftBrand:             null,
            DraftMaterialType:      null,
            DraftColor:             null,
            DraftSpoolWeightGrams:  null,
            DraftPrintSettingsHints:null,
            DraftBatchOrLot:        null,
            ConfidenceMap:          null,
            ApprovedMaterialId:     null,
            ApprovalOutcome:        null,
            RejectionReason:        null,
            UploadedByUserId:       uploaderId ?? Guid.NewGuid(),
            ActionedByUserId:       null,
            CreatedAtUtc:           DateTime.UtcNow,
            ActionedAtUtc:          null);
    }
}

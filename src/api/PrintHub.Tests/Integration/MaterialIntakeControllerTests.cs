using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using PrintHub.Core.DTOs.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Exceptions;

namespace PrintHub.Tests.Integration;

/// <summary>
/// Contract / API integration tests for <see cref="PrintHub.API.Controllers.MaterialIntakeController"/>.
/// Uses <see cref="IntakeWebApplicationFactory"/> with mocked service layer and in-memory DB.
/// Covers:  auth failures, feature-flag 503, happy paths, and validation failures.
/// </summary>
public class MaterialIntakeControllerTests : IClassFixture<IntakeWebApplicationFactory>
{
    private readonly IntakeWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    // Known URL prefix for all intake endpoints
    private const string BaseUrl = "/api/v1/material-intake";

    public MaterialIntakeControllerTests(IntakeWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Auth / 401 ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetIntakeQueue_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync(BaseUrl);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetIntake_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ApproveIntake_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var resp   = await client.PostAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/approve",
            new { pricePerGram = 0.05 });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RejectIntake_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/reject",
            new { reason = "bad photo" });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Auth / 403 (Customer role) ────────────────────────────────────────────

    [Fact]
    public async Task GetIntakeQueue_CustomerRole_Returns403()
    {
        var client = _factory.CreateAuthenticatedClient(role: Role.Customer);
        var resp   = await client.GetAsync(BaseUrl);
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ApproveIntake_CustomerRole_Returns403()
    {
        var client = _factory.CreateAuthenticatedClient(role: Role.Customer);
        var resp   = await client.PostAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/approve",
            new { pricePerGram = 0.05 });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Feature flag ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateIntake_FeatureDisabled_Returns503()
    {
        using var disabledFactory = _factory.WithWebHostBuilder(b =>
            b.ConfigureAppConfiguration((_, cfg) =>
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Intake:FeatureEnabled"] = "false",
                })));

        var token  = _factory.GenerateToken(Guid.NewGuid(), Role.Staff);
        var client = disabledFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }), "file", "test.jpg");

        var resp = await client.PostAsync(BaseUrl, content);
        resp.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task ApproveIntake_FeatureDisabled_Returns503()
    {
        using var disabledFactory = _factory.WithWebHostBuilder(b =>
            b.ConfigureAppConfiguration((_, cfg) =>
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Intake:FeatureEnabled"] = "false",
                })));

        var token  = _factory.GenerateToken(Guid.NewGuid(), Role.Staff);
        var client = disabledFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var resp = await client.PostAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/approve",
            new ApproveIntakeRequest(null, null, null, null, null, null, 0.10m));
        resp.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task RejectIntake_FeatureDisabled_Returns503()
    {
        using var disabledFactory = _factory.WithWebHostBuilder(b =>
            b.ConfigureAppConfiguration((_, cfg) =>
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Intake:FeatureEnabled"] = "false",
                })));

        var token  = _factory.GenerateToken(Guid.NewGuid(), Role.Staff);
        var client = disabledFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var resp = await client.PostAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/reject",
            new RejectIntakeRequest("reason"));
        resp.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    // ── GET /api/v1/material-intake ────────────────────────────────────────────

    [Fact]
    public async Task GetIntakeQueue_StaffRole_Returns200WithPagedResponse()
    {
        var expected = new PagedResponse<MaterialIntakeResponse>
        {
            Items = [],
            Page = 1,
            PageSize = 25,
            TotalCount = 0,
        };

        _factory.IntakeServiceMock
            .Setup(s => s.GetIntakeQueueAsync(It.IsAny<IntakeQueueFilter>()))
            .ReturnsAsync(expected);

        var client = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp   = await client.GetAsync(BaseUrl);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<PagedResponse<MaterialIntakeResponse>>(JsonOpts);
        body.Should().NotBeNull();
        body!.TotalCount.Should().Be(0);
    }

    // ── GET /api/v1/material-intake/{id} ──────────────────────────────────────

    [Fact]
    public async Task GetIntake_ExistingId_Returns200()
    {
        var intakeId = Guid.NewGuid();
        var response = IntakeWebApplicationFactory.BuildIntakeResponse(id: intakeId);

        _factory.IntakeServiceMock
            .Setup(s => s.GetIntakeAsync(intakeId))
            .ReturnsAsync(response);

        var client = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp   = await client.GetAsync($"{BaseUrl}/{intakeId}");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<MaterialIntakeResponse>(JsonOpts);
        body!.Id.Should().Be(intakeId);
    }

    [Fact]
    public async Task GetIntake_MissingId_Returns404()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.GetIntakeAsync(intakeId))
            .ReturnsAsync((MaterialIntakeResponse?)null);

        var client = _factory.CreateAuthenticatedClient();
        var resp   = await client.GetAsync($"{BaseUrl}/{intakeId}");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/v1/material-intake/{id}/approve ─────────────────────────────

    [Fact]
    public async Task ApproveIntake_ValidRequest_Returns200WithApprovalResponse()
    {
        var intakeId   = Guid.NewGuid();
        var materialId = Guid.NewGuid();
        var actorId    = Guid.NewGuid();

        var approvalResponse = new ApproveIntakeResponse(
            IntakeId:          intakeId,
            MaterialId:        materialId,
            Outcome:           IntakeApprovalOutcome.Created,
            ActionedByUserId:  actorId,
            ActionedAtUtc:     DateTime.UtcNow);

        _factory.IntakeServiceMock
            .Setup(s => s.ApproveIntakeAsync(intakeId, It.IsAny<ApproveIntakeRequest>(), It.IsAny<Guid>()))
            .ReturnsAsync(approvalResponse);

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerGram: 0.05m);
        var client  = _factory.CreateAuthenticatedClient(userId: actorId, role: Role.Staff);
        var resp    = await client.PostAsJsonAsync($"{BaseUrl}/{intakeId}/approve", request);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApproveIntakeResponse>(JsonOpts);
        body!.Outcome.Should().Be(IntakeApprovalOutcome.Created);
        body.MaterialId.Should().Be(materialId);
    }

    [Fact]
    public async Task ApproveIntake_IntakeNotFound_Returns404()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.ApproveIntakeAsync(intakeId, It.IsAny<ApproveIntakeRequest>(), It.IsAny<Guid>()))
            .ThrowsAsync(new NotFoundException($"Intake {intakeId} not found."));

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerGram: 0.05m);
        var client  = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp    = await client.PostAsJsonAsync($"{BaseUrl}/{intakeId}/approve", request);

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ApproveIntake_WrongStatus_Returns409()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.ApproveIntakeAsync(intakeId, It.IsAny<ApproveIntakeRequest>(), It.IsAny<Guid>()))
            .ThrowsAsync(new InvalidIntakeTransitionException(IntakeStatus.Uploaded, IntakeStatus.Approved));

        var request = new ApproveIntakeRequest(null, null, null, null, null, null, PricePerGram: 0.05m);
        var client  = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp    = await client.PostAsJsonAsync($"{BaseUrl}/{intakeId}/approve", request);

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── POST /api/v1/material-intake/{id}/reject ──────────────────────────────

    [Fact]
    public async Task RejectIntake_ValidRequest_Returns204()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.RejectIntakeAsync(intakeId, It.IsAny<RejectIntakeRequest>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp   = await client.PostAsJsonAsync($"{BaseUrl}/{intakeId}/reject",
            new RejectIntakeRequest("Image is unusable."));

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task RejectIntake_IntakeNotFound_Returns404()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.RejectIntakeAsync(intakeId, It.IsAny<RejectIntakeRequest>(), It.IsAny<Guid>()))
            .ThrowsAsync(new NotFoundException($"Intake {intakeId} not found."));

        var client = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp   = await client.PostAsJsonAsync($"{BaseUrl}/{intakeId}/reject",
            new RejectIntakeRequest("reason"));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/v1/material-intake/{id}/extract ─────────────────────────────

    [Fact]
    public async Task TriggerExtraction_ValidRequest_Returns202()
    {
        var intakeId = Guid.NewGuid();

        _factory.IntakeServiceMock
            .Setup(s => s.TriggerExtractionAsync(intakeId, It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateAuthenticatedClient(role: Role.Staff);
        var resp   = await client.PostAsync($"{BaseUrl}/{intakeId}/extract", null);

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }
}

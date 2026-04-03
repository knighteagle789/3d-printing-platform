using System.Text;
using System.Text.Json;
using Azure.Storage.Queues;
using Microsoft.Extensions.Options;
using PrintHub.Core.Common;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Entities;
using PrintHub.Core.Interfaces;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services.Intake;

public class MaterialIntakeExtractionWorker : BackgroundService
{
    private readonly QueueClient _queueClient;
    private readonly MaterialIntakeQueueOptions _options;
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MaterialIntakeExtractionWorker> _logger;

    public MaterialIntakeExtractionWorker(
        IConfiguration configuration,
        IOptions<MaterialIntakeQueueOptions> options,
        IServiceScopeFactory scopeFactory,
        ILogger<MaterialIntakeExtractionWorker> logger)
    {
        _configuration = configuration;
        _options = options.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;

        var connectionString = _configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("BlobStorage:ConnectionString is required for queue operations.");

        _queueClient = new QueueClient(connectionString, _options.Name);
        _queueClient.CreateIfNotExists();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Material intake extraction worker started. Queue={QueueName}", _options.Name);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await _queueClient.ReceiveMessagesAsync(
                    maxMessages: 5,
                    visibilityTimeout: TimeSpan.FromSeconds(_options.VisibilityTimeoutSeconds),
                    cancellationToken: stoppingToken);

                var messages = response.Value;
                if (messages.Length == 0)
                {
                    await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
                    continue;
                }

                foreach (var message in messages)
                {
                    await ProcessMessageAsync(message.MessageId, message.PopReceipt, message.MessageText, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in material intake extraction worker loop.");
                await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
            }
        }

        _logger.LogInformation("Material intake extraction worker stopped.");
    }

    private async Task ProcessMessageAsync(string messageId, string popReceipt, string messageText, CancellationToken cancellationToken)
    {
        IntakeExtractionQueueMessage? payload;
        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(messageText));
            payload = JsonSerializer.Deserialize<IntakeExtractionQueueMessage>(json);
            if (payload is null)
            {
                await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize extraction queue message. MessageId={MessageId}", messageId);
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var intakeRepository = scope.ServiceProvider.GetRequiredService<IMaterialIntakeRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var provider = scope.ServiceProvider.GetRequiredService<IExtractionProvider>();

        var intake = await intakeRepository.GetByIdAsync(payload.IntakeId);
        if (intake is null)
        {
            _logger.LogWarning("Extraction message references missing intake {IntakeId}. Deleting message.", payload.IntakeId);
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
            return;
        }

        // If the intake was already actioned while queued, drop this message.
        if (IntakeStateMachine.IsTerminal(intake.Status))
        {
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
            return;
        }

        try
        {
            intake.ExtractionAttemptCount += 1;

            var result = await provider.ExtractAsync(new ExtractionRequest(intake.Id, intake.PhotoUrl), cancellationToken);
            intake.UpdatedAtUtc = DateTime.UtcNow;

            if (!result.Success)
            {
                throw new InvalidOperationException(result.ErrorMessage ?? "Extraction provider returned failure.");
            }

            intake.DraftBrand = result.Brand;
            intake.DraftMaterialType = result.MaterialType;
            intake.DraftColor = result.Color;
            intake.DraftSpoolWeightGrams = result.SpoolWeightGrams;
            intake.DraftPrintSettingsHints = result.PrintSettingsHints;
            intake.DraftBatchOrLot = result.BatchOrLot;
            intake.ConfidenceMap = JsonSerializer.Serialize(
                new Dictionary<string, object?>
                {
                    ["brand"]         = result.Confidence.Brand,
                    ["type"]          = result.Confidence.MaterialType,
                    ["color"]         = result.Confidence.Color,
                    ["spoolWeight"]   = result.Confidence.SpoolWeightGrams,
                    ["printSettings"] = result.Confidence.PrintSettingsHints,
                    ["batchOrLot"]    = result.Confidence.BatchOrLot,
                },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            intake.LastExtractionError = null;
            intake.ExtractedAtUtc = DateTime.UtcNow;

            IntakeStateMachine.EnsureTransition(intake.Status, IntakeStatus.NeedsReview);
            intake.Status = IntakeStatus.NeedsReview;

            await intakeRepository.AddEventAsync(new IntakeEvent
            {
                Id = Guid.NewGuid(),
                IntakeId = intake.Id,
                EventType = "extraction.completed",
                ToStatus = IntakeStatus.NeedsReview,
                ActorUserId = intake.UploadedByUserId,
                Details = JsonSerializer.Serialize(new
                {
                    attempt = intake.ExtractionAttemptCount,
                    provider = provider.GetType().Name
                }),
                OccurredAtUtc = DateTime.UtcNow,
            });

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
        }
        catch (Exception ex)
        {
            intake.LastExtractionError = ex.Message;
            intake.UpdatedAtUtc = DateTime.UtcNow;

            if (intake.ExtractionAttemptCount >= _options.MaxRetries)
            {
                intake.Status = IntakeStatus.Failed;
                intake.ExtractedAtUtc = DateTime.UtcNow;

                await intakeRepository.AddEventAsync(new IntakeEvent
                {
                    Id = Guid.NewGuid(),
                    IntakeId = intake.Id,
                    EventType = "extraction.failed",
                    ToStatus = IntakeStatus.Failed,
                    ActorUserId = intake.UploadedByUserId,
                    Details = JsonSerializer.Serialize(new
                    {
                        attempt = intake.ExtractionAttemptCount,
                        error = ex.Message,
                        maxRetries = _options.MaxRetries
                    }),
                    OccurredAtUtc = DateTime.UtcNow,
                });

                await unitOfWork.SaveChangesAsync(cancellationToken);
                await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);

                _logger.LogWarning(ex,
                    "Extraction failed permanently for intake {IntakeId} after {Attempts} attempts.",
                    intake.Id,
                    intake.ExtractionAttemptCount);
            }
            else
            {
                await intakeRepository.AddEventAsync(new IntakeEvent
                {
                    Id = Guid.NewGuid(),
                    IntakeId = intake.Id,
                    EventType = "extraction.retrying",
                    ToStatus = intake.Status,
                    ActorUserId = intake.UploadedByUserId,
                    Details = JsonSerializer.Serialize(new
                    {
                        attempt = intake.ExtractionAttemptCount,
                        error = ex.Message,
                        maxRetries = _options.MaxRetries
                    }),
                    OccurredAtUtc = DateTime.UtcNow,
                });

                await unitOfWork.SaveChangesAsync(cancellationToken);

                var retryMessage = new IntakeExtractionQueueMessage(
                    intake.Id,
                    intake.PhotoBlobName,
                    intake.ExtractionAttemptCount + 1,
                    DateTime.UtcNow);

                var payloadJson = JsonSerializer.Serialize(retryMessage);
                await _queueClient.SendMessageAsync(
                    Convert.ToBase64String(Encoding.UTF8.GetBytes(payloadJson)),
                    visibilityTimeout: TimeSpan.FromSeconds(_options.VisibilityTimeoutSeconds),
                    cancellationToken: cancellationToken);

                await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);

                _logger.LogWarning(ex,
                    "Extraction failed for intake {IntakeId}. Retrying (attempt {Attempt}/{MaxRetries}).",
                    intake.Id,
                    intake.ExtractionAttemptCount,
                    _options.MaxRetries);
            }
        }
    }
}

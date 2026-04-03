using System.Text;
using System.Text.Json;
using Azure.Storage.Queues;
using Microsoft.Extensions.Options;
using PrintHub.Core.DTOs.Intake;

namespace PrintHub.API.Services.Intake;

/// <summary>
/// Background worker that polls the Azure Storage Queue and delegates
/// each message to <see cref="IntakeExtractionProcessor"/>.
/// Handles queue transport concerns (deserialise, delete, re-enqueue);
/// all business/retry logic lives in the processor.
/// </summary>
public class MaterialIntakeExtractionWorker : BackgroundService
{
    private readonly QueueClient _queueClient;
    private readonly MaterialIntakeQueueOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MaterialIntakeExtractionWorker> _logger;

    public MaterialIntakeExtractionWorker(
        IConfiguration configuration,
        IOptions<MaterialIntakeQueueOptions> options,
        IServiceScopeFactory scopeFactory,
        ILogger<MaterialIntakeExtractionWorker> logger)
    {
        _options      = options.Value;
        _scopeFactory = scopeFactory;
        _logger       = logger;

        var connectionString = configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException(
                "BlobStorage:ConnectionString is required for queue operations.");

        _queueClient = new QueueClient(connectionString, _options.Name);
        _queueClient.CreateIfNotExists();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Material intake extraction worker started. Queue={QueueName}", _options.Name);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await _queueClient.ReceiveMessagesAsync(
                    maxMessages:       5,
                    visibilityTimeout: TimeSpan.FromSeconds(_options.VisibilityTimeoutSeconds),
                    cancellationToken: stoppingToken);

                var messages = response.Value;
                if (messages.Length == 0)
                {
                    await Task.Delay(
                        TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
                    continue;
                }

                foreach (var message in messages)
                {
                    await ProcessMessageAsync(
                        message.MessageId, message.PopReceipt,
                        message.MessageText, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unhandled error in material intake extraction worker loop.");
                await Task.Delay(
                    TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
            }
        }

        _logger.LogInformation("Material intake extraction worker stopped.");
    }

    private async Task ProcessMessageAsync(
        string messageId,
        string popReceipt,
        string messageText,
        CancellationToken cancellationToken)
    {
        // 1. Deserialise
        IntakeExtractionQueueMessage? payload;
        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(messageText));
            payload  = JsonSerializer.Deserialize<IntakeExtractionQueueMessage>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to deserialise extraction queue message. MessageId={MessageId}", messageId);
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
            return;
        }

        if (payload is null)
        {
            await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
            return;
        }

        // 2. Delegate to the processor
        using var scope = _scopeFactory.CreateScope();
        var processor   = scope.ServiceProvider.GetRequiredService<IntakeExtractionProcessor>();

        var outcome = await processor.ProcessAsync(payload.IntakeId, cancellationToken);

        // 3. Handle queue message based on outcome
        switch (outcome)
        {
            case ExtractionProcessingOutcome.Succeeded:
            case ExtractionProcessingOutcome.DeadLettered:
            case ExtractionProcessingOutcome.Discarded:
                await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
                break;

            case ExtractionProcessingOutcome.Retry:
                var retryMessage = new IntakeExtractionQueueMessage(
                    payload.IntakeId,
                    payload.BlobRef,
                    payload.Attempt + 1,
                    DateTime.UtcNow);

                var payloadJson = JsonSerializer.Serialize(retryMessage);
                await _queueClient.SendMessageAsync(
                    Convert.ToBase64String(Encoding.UTF8.GetBytes(payloadJson)),
                    visibilityTimeout: TimeSpan.FromSeconds(_options.VisibilityTimeoutSeconds),
                    cancellationToken: cancellationToken);

                await _queueClient.DeleteMessageAsync(messageId, popReceipt, cancellationToken);
                break;
        }
    }
}

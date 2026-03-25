using System.Text;
using System.Text.Json;
using Azure.Storage.Queues;
using PrintHub.Core.DTOs.Intake;
using PrintHub.Core.Interfaces.Services;

namespace PrintHub.API.Services.Intake;

public class AzureMaterialIntakeQueue : IIntakeExtractionQueue
{
    private readonly QueueClient _queueClient;

    public AzureMaterialIntakeQueue(IConfiguration configuration)
    {
        var connectionString = configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("BlobStorage:ConnectionString is required for queue operations.");

        var queueName = configuration["Intake:Queue:Name"] ?? "material-intake-extraction";

        _queueClient = new QueueClient(connectionString, queueName);
        _queueClient.CreateIfNotExists();
    }

    public async Task EnqueueAsync(IntakeExtractionQueueMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(message);
        await _queueClient.SendMessageAsync(Convert.ToBase64String(Encoding.UTF8.GetBytes(payload)), cancellationToken: cancellationToken);
    }
}

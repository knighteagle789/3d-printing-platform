using PrintHub.Core.DTOs.Intake;

namespace PrintHub.Core.Interfaces.Services;

/// <summary>
/// Abstraction for enqueueing/dequeueing material intake extraction jobs.
/// Backed by Azure Storage Queue in production/local Azurite.
/// </summary>
public interface IIntakeExtractionQueue
{
    Task EnqueueAsync(IntakeExtractionQueueMessage message, CancellationToken cancellationToken = default);
}

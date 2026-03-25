namespace PrintHub.Core.DTOs.Intake;

/// <summary>
/// Queue message contract for asynchronous material intake extraction.
/// </summary>
public record IntakeExtractionQueueMessage(
    Guid IntakeId,
    string BlobRef,
    int Attempt,
    DateTime RequestedAtUtc
);

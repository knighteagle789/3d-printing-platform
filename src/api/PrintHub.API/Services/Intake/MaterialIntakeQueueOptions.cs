namespace PrintHub.API.Services.Intake;

public class MaterialIntakeQueueOptions
{
    public string Name { get; set; } = "material-intake-extraction";

    public int PollIntervalSeconds { get; set; } = 5;

    public int MaxRetries { get; set; } = 3;

    public int VisibilityTimeoutSeconds { get; set; } = 30;
}

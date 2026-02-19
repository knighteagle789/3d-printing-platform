namespace PrintHub.Core.Entities;

/// <summary>
/// Represents an image in a portfolio item's gallery.
/// Stored as jsonb in PostgreSQL — not a separate table.
/// </summary>
public class PortfolioImage
{
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public string? AltText { get; set; }
    public int Order { get; set; }
}
namespace PrintHub.Core.DTOs.Pricing;

/// <summary>
/// Public pricing configuration returned to clients.
/// Used by the order/quote forms to calculate live price estimates.
/// Values are configured in appsettings.json and overridden per environment.
/// </summary>
public record PricingConfigResponse(
    /// <summary>
    /// Flat fee charged per unique model submitted, regardless of quantity.
    /// Covers slicer setup, print start, and quality check time.
    /// </summary>
    decimal HandlingFeePerModel,

    /// <summary>
    /// Quality tier multipliers applied to the base material cost.
    /// Key = quality tier name (e.g. "Draft", "Standard", "High").
    /// </summary>
    Dictionary<string, decimal> QualityMultipliers
);
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using PrintHub.Core.DTOs.Pricing;

namespace PrintHub.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class PricingController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public PricingController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Returns public pricing configuration used by the frontend
    /// to calculate live order/quote estimates.
    /// No authentication required — these are public rates.
    /// </summary>
    [HttpGet("config")]
    public ActionResult<PricingConfigResponse> GetConfig()
    {
        var handlingFee = _configuration.GetValue<decimal>("Pricing:HandlingFeePerModel", 4.00m);

        var multipliers = new Dictionary<string, decimal>
        {
            ["Draft"]    = _configuration.GetValue<decimal>("Pricing:QualityMultipliers:Draft",    0.8m),
            ["Standard"] = _configuration.GetValue<decimal>("Pricing:QualityMultipliers:Standard", 1.0m),
            ["High"]     = _configuration.GetValue<decimal>("Pricing:QualityMultipliers:High",     1.3m),
        };

        return Ok(new PricingConfigResponse(
            HandlingFeePerModel: handlingFee,
            QualityMultipliers:  multipliers
        ));
    }
}
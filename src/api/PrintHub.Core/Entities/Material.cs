using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a specific, orderable filament/resin stock item.
    /// Each record is a distinct product (e.g. "PLA - Black - Prusament"),
    /// not an abstract material type with multiple color options.
    /// </summary>
    public class Material
    {
        public Guid Id { get; set; }

        /// <summary>The base material type (PLA, ABS, PETG, etc.)</summary>
        public MaterialType Type { get; set; }

        /// <summary>The specific color of this stock item (e.g. "Black", "Galaxy Black").</summary>
        public string Color { get; set; } = string.Empty;

        /// <summary>Surface finish variant. Null = not applicable for this material.</summary>
        public MaterialFinish? Finish { get; set; }

        /// <summary>Quality grade. Null = not applicable for this material.</summary>
        public MaterialGrade? Grade { get; set; }

        /// <summary>
        /// Customer-facing description of this material's properties and best use cases.
        /// (e.g. "Great for detailed miniatures. Produces smooth, glossy surfaces.")
        /// </summary>
        public string? Description { get; set; }

        /// <summary>
        /// Brand/Manufacturer — internal only, never returned in public DTOs.
        /// Used for inventory management (knowing which roll to grab).
        /// </summary>
        public string? Brand { get; set; }

        /// <summary>Price per gram in USD.</summary>
        public decimal PricePerGram { get; set; }

        /// <summary>Current stock level in grams.</summary>
        public decimal StockGrams { get; set; }

        /// <summary>
        /// Stock level (in grams) below which a low-stock warning is shown in admin.
        /// Null = no threshold configured.
        /// </summary>
        public decimal? LowStockThresholdGrams { get; set; }

        /// <summary>Internal notes about this batch/roll (not customer-facing).</summary>
        public string? Notes { get; set; }

        /// <summary>
        /// Printer/slicer settings as JSONB. Schema varies by technology.
        /// FDM: { bedTemp, hotendTemp, printSpeed, coolingFan, ... }
        /// SLA: { layerExposureTime, liftSpeed, uvWavelength, washTime, ... }
        /// </summary>
        public string? PrintSettings { get; set; }

        public Guid? PrintingTechnologyId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual PrintingTechnology? PrintingTechnology { get; set; }
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    public enum MaterialType
    {
        PLA,
        ABS,
        PETG,
        TPU,
        Nylon,
        Resin,
        ASA,
        PolyCarbonate,
        Metal,
        Carbon,
        Wood,
        Ceramic,
        Other
    }

    public enum MaterialFinish
    {
        Standard,
        Matte,
        Silk,
        Glossy
    }

    public enum MaterialGrade
    {
        Economy,
        Standard,
        Premium
    }

    /// <summary>
    /// Represents a 3D printing technology/method (FDM, SLA, etc.)
    /// </summary>
    public class PrintingTechnology
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public TechnologyType Type { get; set; }

        /// <summary>Maximum printable dimensions in mm (e.g. "300x300x400")</summary>
        public string MaxDimensions { get; set; } = string.Empty;

        /// <summary>Layer height range in mm (e.g. "0.1-0.3")</summary>
        public string LayerHeightRange { get; set; } = string.Empty;

        /// <summary>Typical print speed in mm/s</summary>
        public decimal TypicalSpeed { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
    }

    public enum TechnologyType
    {
        FDM,
        SLA,
        DLP,
        SLS,
        MJF,
        DMLS,
        Binder
    }
}
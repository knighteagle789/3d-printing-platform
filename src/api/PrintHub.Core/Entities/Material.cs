using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a 3D printing material available for orders
    /// </summary>
    public class Material
    {
        public Guid Id { get; set; }
        
        public string Name { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public MaterialType Type { get; set; }

        /// <summary>
        /// Brand/Manufacturer of the material (e.g., "Hatchbox", "Prusament", "Formlabs", "Polymaker", etc.)
        /// </summary>
        public string? Brand { get; set; }

        /// <summary>
        /// Price per gram in USD
        /// </summary>
        public decimal PricePerGram { get; set; }
        
        /// <summary>
        /// Available colors (comma-separated or JSON array)
        /// </summary>
        public string[]? AvailableColors { get; set; }
        
        /// <summary>
        /// Material properties as JSON (strength, flexibility, temperature resistance, etc.)
        /// </summary>
        public string? Properties { get; set; }

        /// <summary>
        /// Foreign key to the printing technology this material is compatible with.
        /// Nullable because some materials might work with multiple technologies
        /// (handled later with a many-to-many relationship if needed).
        /// </summary>
        public Guid? PrintingTechnologyId { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public virtual PrintingTechnology? PrintingTechnology { get; set; }
    }
    
    /// <summary>
    /// Types of 3D printing materials
    /// </summary>
    public enum MaterialType
    {
        PLA,            // Polylactic Acid - most common
        ABS,            // Acrylonitrile Butadiene Styrene
        PETG,           // Polyethylene Terephthalate Glycol
        TPU,            // Thermoplastic Polyurethane (flexible)
        Nylon,          // Polyamide
        Resin,          // UV-curable resin (SLA/DLP)
        ASA,            // Similar to ABS but weather-resistant
        PolyCarbonate,  // High strength engineering plastic
        Metal,          // Metal powders for SLS/DMLS
        Wood,           // Wood-filled filament
        Carbon          // Carbon fiber composite
    }
    
    /// <summary>
    /// Represents a 3D printing technology/method
    /// </summary>
    public class PrintingTechnology
    {
        public Guid Id { get; set; }
        
        public string Name { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public TechnologyType Type { get; set; }
        
        /// <summary>
        /// Maximum printable dimensions in mm (e.g., "300x300x400")
        /// </summary>
        public string MaxDimensions { get; set; } = string.Empty;
        
        /// <summary>
        /// Layer height range in mm (e.g., "0.1-0.3")
        /// </summary>
        public string LayerHeightRange { get; set; } = string.Empty;
        
        /// <summary>
        /// Typical print speed in mm/s
        /// </summary>
        public decimal TypicalSpeed { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; }
    }
    
    /// <summary>
    /// 3D printing technology types
    /// </summary>
    public enum TechnologyType
    {
        FDM,    // Fused Deposition Modeling (most common)
        SLA,    // Stereolithography (resin)
        DLP,    // Digital Light Processing (resin)
        SLS,    // Selective Laser Sintering
        MJF,    // Multi Jet Fusion
        DMLS,   // Direct Metal Laser Sintering
        Binder  // Binder Jetting
    }
}
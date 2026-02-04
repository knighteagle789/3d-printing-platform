using System;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a file uploaded by a user
    /// </summary>
    public class UploadedFile
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public string OriginalFileName { get; set; } = string.Empty;
        
        public string StorageUrl { get; set; } = string.Empty;
        
        public string BlobName { get; set; } = string.Empty;
        
        public FileType FileType { get; set; }
        
        public long FileSizeBytes { get; set; }
        
        public string? ContentType { get; set; }
        
        public string? Checksum { get; set; }
        
        public bool IsAnalyzed { get; set; }
        
        public DateTime UploadedAt { get; set; }
        
        public DateTime? DeletedAt { get; set; }
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
        
        public virtual FileAnalysis? Analysis { get; set; }
    }
    
    /// <summary>
    /// Stores analysis results of a 3D model file
    /// </summary>
    public class FileAnalysis
    {
        public Guid Id { get; set; }
        
        public Guid FileId { get; set; }
        
        /// <summary>
        /// Model volume in cubic millimeters
        /// </summary>
        public decimal? VolumeInCubicMm { get; set; }
        
        /// <summary>
        /// Bounding box dimensions in mm
        /// </summary>
        public decimal? DimensionX { get; set; }
        
        public decimal? DimensionY { get; set; }
        
        public decimal? DimensionZ { get; set; }
        
        /// <summary>
        /// Number of triangles in the mesh
        /// </summary>
        public int? TriangleCount { get; set; }
        
        /// <summary>
        /// Number of vertices in the mesh
        /// </summary>
        public int? VertexCount { get; set; }
        
        /// <summary>
        /// Surface area in square millimeters
        /// </summary>
        public decimal? SurfaceArea { get; set; }
        
        /// <summary>
        /// Estimated print time in hours
        /// </summary>
        public decimal? EstimatedPrintTimeHours { get; set; }
        
        /// <summary>
        /// Estimated material weight in grams
        /// </summary>
        public decimal? EstimatedWeightGrams { get; set; }
        
        /// <summary>
        /// Complexity score (0-100)
        /// </summary>
        public int? ComplexityScore { get; set; }
        
        /// <summary>
        /// Whether the model requires support structures
        /// </summary>
        public bool? RequiresSupport { get; set; }
        
        /// <summary>
        /// Whether the model is manifold (watertight)
        /// </summary>
        public bool? IsManifold { get; set; }
        
        /// <summary>
        /// Number of detected errors in the mesh
        /// </summary>
        public int? ErrorCount { get; set; }
        
        /// <summary>
        /// Warnings or issues found during analysis (JSON array)
        /// </summary>
        public string? Warnings { get; set; }
        
        /// <summary>
        /// Thumbnail image URL
        /// </summary>
        public string? ThumbnailUrl { get; set; }
        
        public DateTime AnalyzedAt { get; set; }
        
        // Navigation properties
        public virtual UploadedFile File { get; set; } = null!;
    }
    
    /// <summary>
    /// Supported file types
    /// </summary>
    public enum FileType
    {
        STL,        // Standard Tessellation Language
        OBJ,        // Wavefront Object
        ThreeMF,    // 3D Manufacturing Format
        STEP,       // Standard for Exchange of Product Data
        IGES,       // Initial Graphics Exchange Specification
        Gcode,      // G-code (ready to print)
        AMF,        // Additive Manufacturing Format
        PLY         // Polygon File Format
    }
}
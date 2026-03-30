using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a customer order
    /// </summary>
    public class Order
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public string OrderNumber { get; set; } = string.Empty;
        
        public OrderStatus Status { get; set; }
        
        public decimal TotalPrice { get; set; }
        
        public decimal? ShippingCost { get; set; }
        
        public decimal? Tax { get; set; }
        
        public string? Notes { get; set; }
        
        public string? ShippingAddress { get; set; }
        
        public DateTime? RequiredByDate { get; set; }
        
        public DateTime? ShippedAt { get; set; }
        
        public DateTime? CompletedAt { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// The quote request this order was created from, if any.
        /// Null for orders placed directly without a quote flow.
        /// </summary>
        public Guid? QuoteRequestId { get; set; }
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
        
        public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        
        public virtual ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();

        /// <summary>
        /// The source quote request, populated when this order originated from a quote flow.
        /// </summary>
        public virtual QuoteRequest? SourceQuote { get; set; }
    }
    
    /// <summary>
    /// Represents a single item in an order
    /// </summary>
    public class OrderItem
    {
        public Guid Id { get; set; }
        
        public Guid OrderId { get; set; }
        
        public Guid MaterialId { get; set; }
        
        public Guid FileId { get; set; }
        
        public int Quantity { get; set; }
        
        public decimal UnitPrice { get; set; }
        
        public decimal TotalPrice { get; set; }
        
        public string? Color { get; set; }
        
        public string? SpecialInstructions { get; set; }
        
        /// <summary>
        /// Estimated weight in grams
        /// </summary>
        public decimal? EstimatedWeight { get; set; }
        
        /// <summary>
        /// Estimated print time in hours
        /// </summary>
        public decimal? EstimatedPrintTime { get; set; }

        /// <summary>
        /// Machine cost snapshot for this item (print time × machine rate × quantity).
        /// Captured at order creation so the breakdown never drifts if the rate changes.
        /// Null if print time was unavailable at the time of order.
        /// </summary>
        public decimal? MachineCost { get; set; }
        
        public PrintQuality Quality { get; set; } = PrintQuality.Standard;
        
        public decimal? Infill { get; set; } = 20; // Default 20%
        
        public bool SupportStructures { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        // Navigation properties
        public virtual Order Order { get; set; } = null!;
        
        public virtual Material Material { get; set; } = null!;
        
        public virtual UploadedFile File { get; set; } = null!;
    }
    
    /// <summary>
    /// Tracks order status changes
    /// </summary>
    public class OrderStatusHistory
    {
        public Guid Id { get; set; }
        
        public Guid OrderId { get; set; }
        
        public OrderStatus Status { get; set; }
        
        public string? Notes { get; set; }
        
        public Guid? ChangedByUserId { get; set; }
        
        public DateTime ChangedAt { get; set; }
        
        // Navigation properties
        public virtual Order Order { get; set; } = null!;
        
        public virtual User? ChangedBy { get; set; }
    }
    
    /// <summary>
    /// Order status workflow
    /// </summary>
    public enum OrderStatus
    {
        Draft,          // Customer is building order
        Submitted,      // Order submitted, awaiting review
        InReview,       // Being reviewed by operator
        QuoteProvided,  // Quote/estimate provided to customer
        Approved,       // Customer approved quote
        InProduction,   // Files are being prepared/printed
        Printing,       // Currently printing
        PostProcessing, // Support removal, cleaning, etc.
        QualityCheck,   // Quality inspection
        Packaging,      // Being packaged
        Shipped,        // Shipped to customer
        Delivered,      // Delivered to customer
        Completed,      // Order fully completed
        Cancelled,      // Order cancelled
        OnHold          // Temporarily on hold
    }
    
    /// <summary>
    /// Print quality settings
    /// </summary>
    public enum PrintQuality
    {
        Draft,      // 0.3mm layers - fast, rough
        Standard,   // 0.2mm layers - balanced
        High,       // 0.15mm layers - good detail
        UltraHigh   // 0.1mm layers - best detail, slow
    }
}
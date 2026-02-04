using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a quote request from a customer
    /// </summary>
    public class QuoteRequest
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public string RequestNumber { get; set; } = string.Empty;
        
        public QuoteStatus Status { get; set; }
        
        public Guid? FileId { get; set; }
        
        public int Quantity { get; set; } = 1;
        
        public Guid? PreferredMaterialId { get; set; }
        
        public string? PreferredColor { get; set; }
        
        public DateTime? RequiredByDate { get; set; }
        
        public string? SpecialRequirements { get; set; }
        
        public string? Notes { get; set; }
        
        /// <summary>
        /// Customer's budget range (optional)
        /// </summary>
        public decimal? BudgetMin { get; set; }
        
        public decimal? BudgetMax { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
        
        public virtual UploadedFile? File { get; set; }
        
        public virtual Material? PreferredMaterial { get; set; }
        
        public virtual ICollection<QuoteResponse> Responses { get; set; } = new List<QuoteResponse>();
    }
    
    /// <summary>
    /// Represents a quote response from the company
    /// </summary>
    public class QuoteResponse
    {
        public Guid Id { get; set; }
        
        public Guid QuoteRequestId { get; set; }
        
        public decimal Price { get; set; }
        
        public decimal? ShippingCost { get; set; }
        
        public int EstimatedDays { get; set; }
        
        public Guid? RecommendedMaterialId { get; set; }
        
        public string? RecommendedColor { get; set; }
        
        public string? TechnicalNotes { get; set; }
        
        public string? AlternativeOptions { get; set; }
        
        public DateTime ExpiresAt { get; set; }
        
        public bool IsAccepted { get; set; }
        
        public DateTime? AcceptedAt { get; set; }
        
        public Guid CreatedByUserId { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual QuoteRequest QuoteRequest { get; set; } = null!;
        
        public virtual Material? RecommendedMaterial { get; set; }
        
        public virtual User CreatedBy { get; set; } = null!;
    }
    
    /// <summary>
    /// Quote request status
    /// </summary>
    public enum QuoteStatus
    {
        Pending,        // Just submitted
        InReview,       // Being reviewed by staff
        QuoteProvided,  // Quote sent to customer
        Accepted,       // Customer accepted quote
        Declined,       // Customer declined quote
        Expired,        // Quote expired without acceptance
        Cancelled       // Request cancelled
    }
}
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
        public BudgetRange? BudgetRangeOption { get; set; }
        public decimal? BudgetMin { get; set; }
        
        public decimal? BudgetMax { get; set; }

        /// <summary>
        /// Display the budget as a user-friendly string based on the provided values
        /// </summary>
        /// <returns></returns>
        public string GetBudgetDisplay()
        {
            // If custom budget specified, use pattern matching to handle all cases
            if (BudgetMin.HasValue || BudgetMax.HasValue)
            {
                return (BudgetMin, BudgetMax) switch
                {
                    (not null, not null) => $"${BudgetMin.Value:F2} - ${BudgetMax.Value:F2}",
                    (null, not null) => $"Up to ${BudgetMax.Value:F2}",
                    (not null, null) => $"At least ${BudgetMin.Value:F2}",
                    _ => "Not Specified"
                };
            }

            return BudgetRangeOption switch
            {
                BudgetRange.Under50 => "Under $50",
                BudgetRange.Between50And100 => "$50 - $100",
                BudgetRange.Between100And200 => "$100 - $200",
                BudgetRange.Between200And500 => "$200 - $500",
                BudgetRange.Over500 => "Over $500",
                BudgetRange.NoPreference => "No Preference",
                _ => "Not Specified"
            };
        }

        /// <summary>
        /// Check if a quote price is within budget
        /// </summary>
        public bool IsWithinBudget(decimal quotePrice)
        {
            // If custom max specified, use it
            if (BudgetMax.HasValue)
            {
                return quotePrice <= BudgetMax.Value;
            }

            //otherwise check enum range
            return BudgetRangeOption switch
            {
                BudgetRange.Under50 => quotePrice <= 50m,           // up to 50
                BudgetRange.Between50And100 => quotePrice <= 100m,  // up to 100
                BudgetRange.Between100And200 => quotePrice <= 200m, // up to 200
                BudgetRange.Between200And500 => quotePrice <= 500m, // up to 500
                BudgetRange.Over500 => true,                        // No upper limit
                BudgetRange.NoPreference => true,
                null => true,
                _ => true
            };
        }

        /// <summary>
        /// Get maximum budget value for filtering/sorting
        /// </summary>
        public decimal? GetMaxBudget()
        {
            if (BudgetMax.HasValue)
            {
                return BudgetMax.Value;
            }

            return BudgetRangeOption switch
            {
                BudgetRange.Under50 => 50m,
                BudgetRange.Between50And100 => 100m,
                BudgetRange.Between100And200 => 200m,
                BudgetRange.Between200And500 => 500m,
                BudgetRange.Over500 => null, // No upper limit
                BudgetRange.NoPreference => null,
                null => null,
                _ => null
            };
        }
        
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

    /// <summary>
    /// Customer's budget range for the quote request
    /// </summary>
    public enum BudgetRange
    {
        Under50,
        Between50And100,
        Between100And200,
        Between200And500,
        Over500,
        NoPreference
    }
}
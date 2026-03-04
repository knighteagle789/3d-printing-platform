namespace PrintHub.Core.Entities;

public class Payment
{
    public Guid Id { get; set; }
    
    public Guid OrderId { get; set; }
    
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Stripe PaymentIntent or Checkout Session ID
    /// </summary>
    public string StripeSessionId { get; set; } = string.Empty;
    
    public string? StripePaymentIntentId { get; set; }
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = "usd";
    
    public PaymentStatus Status { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime? CompletedAt { get; set; }
    
    // Navigation properties
    public virtual Order Order { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public enum PaymentStatus
{
    Pending,
    Succeeded,
    Failed,
    Cancelled,
    Refunded
}
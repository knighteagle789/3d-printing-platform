using System;
using System.Collections.Generic;

namespace PrintHub.Core.Entities
{
    /// <summary>
    /// Represents a user in the PrintHub system
    /// </summary>
    public class User
    {
        public Guid Id { get; set; }
        
        public string Email { get; set; } = string.Empty;
        
        public string PasswordHash { get; set; } = string.Empty;
        
        public string FirstName { get; set; } = string.Empty;
        
        public string LastName { get; set; } = string.Empty;
        
        public string? PhoneNumber { get; set; }
        
        public string? CompanyName { get; set; }
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        
        public DateTime? LastLoginAt { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public bool EmailConfirmed { get; set; }
        
        // Navigation properties
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
        
        public virtual ICollection<QuoteRequest> QuoteRequests { get; set; } = new List<QuoteRequest>();
        
        public virtual ICollection<UploadedFile> UploadedFiles { get; set; } = new List<UploadedFile>();
        
        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
    
    /// <summary>
    /// User role mapping
    /// </summary>
    public class UserRole
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public Role Role { get; set; }
        
        public DateTime AssignedAt { get; set; }
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
    }
    
    /// <summary>
    /// Available user roles
    /// </summary>
    public enum Role
    {
        Customer,
        Admin,
        Staff,
        Manager
    }
}
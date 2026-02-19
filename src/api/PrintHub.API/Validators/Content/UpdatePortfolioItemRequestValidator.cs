using FluentValidation;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Content;

public class UpdatePortfolioItemRequestValidator : AbstractValidator<UpdatePortfolioItemRequest>
{
    public UpdatePortfolioItemRequestValidator()
    {
        RuleFor(x => x.Title)
            .Must(t => !string.IsNullOrWhiteSpace(t))
            .WithMessage("Title cannot be empty.")
            .MaximumLength(300).WithMessage("Title cannot exceed 300 characters.")
            .When(x => x.Title != null);

        RuleFor(x => x.Description)
            .Must(d => !string.IsNullOrWhiteSpace(d))
            .WithMessage("Description cannot be empty.")
            .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.DetailedDescription)
            .MaximumLength(4000).WithMessage("Detailed description cannot exceed 4000 characters.")
            .When(x => x.DetailedDescription != null);

        RuleFor(x => x.Category)
            .Must(BeAValidCategory!).WithMessage("Invalid portfolio category.")
            .When(x => x.Category != null);

        RuleFor(x => x.ImageUrl)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _) || url!.StartsWith("/"))
            .WithMessage("Image must be a valid URL or relative path.")
            .MaximumLength(500).WithMessage("Image URL cannot exceed 500 characters.")
            .When(x => x.ImageUrl != null);
        
        RuleForEach(x => x.AdditionalImages)
            .SetValidator(new PortfolioImageDtoValidator())
            .When(x => x.AdditionalImages != null);

        RuleForEach(x => x.Tags)
            .NotEmpty().WithMessage("Tag names cannot be empty.")
            .MaximumLength(50).WithMessage("Tag cannot exceed 50 characters.")
            .Matches("^[a-zA-Z0-9-]+$").WithMessage("Tags can only contain letters, numbers, and hyphens.")
            .When(x => x.Tags != null);

        RuleFor(x => x.MaterialId)
            .NotEqual(Guid.Empty).WithMessage("Invalid material ID.")
            .When(x => x.MaterialId != null);

        RuleFor(x => x.DisplayOrder)
            .GreaterThanOrEqualTo(0).WithMessage("Display order cannot be negative.")
            .LessThanOrEqualTo(9999).WithMessage("Display order cannot exceed 9999.")
            .When(x => x.DisplayOrder != null);
    }

    private static bool BeAValidCategory(string category)
    {
        return Enum.TryParse<PortfolioCategory>(category, ignoreCase: true, out _);
    }
}
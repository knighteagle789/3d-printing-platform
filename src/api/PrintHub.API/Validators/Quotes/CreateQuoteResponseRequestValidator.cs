using FluentValidation;
using PrintHub.Core.DTOs.Quotes;

namespace PrintHub.API.Validators.Quotes;

public class CreateQuoteResponseRequestValidator : AbstractValidator<CreateQuoteResponseRequest>
{
    public CreateQuoteResponseRequestValidator()
    {
        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Price must be greater than zero.");

        RuleFor(x => x.ShippingCost)
            .GreaterThanOrEqualTo(0).WithMessage("Shipping cost cannot be negative.")
            .When(x => x.ShippingCost != null);

        RuleFor(x => x.EstimatedDays)
            .GreaterThan(0).WithMessage("Estimated days must be at least 1.")
            .LessThanOrEqualTo(365).WithMessage("Estimated days cannot exceed 365.");

        RuleFor(x => x.ExpiresInDays)
            .InclusiveBetween(1, 90).WithMessage("Quote expiration must be between 1 and 90 days.");

        RuleFor(x => x.RecommendedMaterialId)
            .NotEqual(Guid.Empty).WithMessage("Invalid material ID.")
            .When(x => x.RecommendedMaterialId != null);

        RuleFor(x => x.TechnicalNotes)
            .MaximumLength(4000).WithMessage("Technical notes cannot exceed 4000 characters.")
            .When(x => x.TechnicalNotes != null);

        RuleFor(x => x.AlternativeOptions)
            .MaximumLength(2000).WithMessage("Alternative options cannot exceed 2000 characters.")
            .When(x => x.AlternativeOptions != null);
    }
}
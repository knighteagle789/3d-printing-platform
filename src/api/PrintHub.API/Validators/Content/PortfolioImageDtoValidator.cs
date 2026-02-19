using FluentValidation;
using PrintHub.Core.DTOs.Content;

namespace PrintHub.API.Validators.Content;

public class PortfolioImageDtoValidator : AbstractValidator<PortfolioImageDto>
{
    public PortfolioImageDtoValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("Image URL is required.")
            .MaximumLength(500).WithMessage("Image URL cannot exceed 500 characters.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _) || url.StartsWith("/"))
            .WithMessage("Image must be a valid URL or relative path.");

        RuleFor(x => x.Caption)
            .MaximumLength(300).WithMessage("Caption cannot exceed 300 characters.")
            .When(x => x.Caption != null);

        RuleFor(x => x.AltText)
            .MaximumLength(300).WithMessage("Alt text cannot exceed 300 characters.")
            .When(x => x.AltText != null);

        RuleFor(x => x.Order)
            .GreaterThanOrEqualTo(0).WithMessage("Order cannot be negative.")
            .LessThanOrEqualTo(100).WithMessage("Order cannot exceed 100.");
    }
}
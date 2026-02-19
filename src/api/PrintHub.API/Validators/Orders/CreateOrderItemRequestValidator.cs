using FluentValidation;
using PrintHub.Core.DTOs.Orders;

namespace PrintHub.API.Validators.Orders;

public class CreateOrderItemRequestValidator : AbstractValidator<CreateOrderItemRequest>
{
    public CreateOrderItemRequestValidator()
    {
        RuleFor(x => x.FileId)
            .NotEqual(Guid.Empty).WithMessage("A valid file ID is required.");

        RuleFor(x => x.MaterialId)
            .NotEqual(Guid.Empty).WithMessage("A valid material ID is required.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be at least 1.")
            .LessThanOrEqualTo(1000).WithMessage("Quantity cannot exceed 1000.");

        RuleFor(x => x.Quality)
            .NotEmpty().WithMessage("Print quality is required.")
            .Must(q => new[] { "Draft", "Standard", "High", "UltraHigh" }
                .Contains(q, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Quality must be Draft, Standard, High, or UltraHigh.");

        RuleFor(x => x.Infill)
            .InclusiveBetween(0, 100).WithMessage("Infill must be between 0 and 100 percent.")
            .When(x => x.Infill != null);

        RuleFor(x => x.Color)
            .MaximumLength(50).WithMessage("Color cannot exceed 50 characters.")
            .When(x => x.Color != null);

        RuleFor(x => x.SpecialInstructions)
            .MaximumLength(1000).WithMessage("Special instructions cannot exceed 1000 characters.")
            .When(x => x.SpecialInstructions != null);
    }
}
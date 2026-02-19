using FluentValidation;
using PrintHub.Core.DTOs.Orders;

namespace PrintHub.API.Validators.Orders;

public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Order must contain at least one item.");

        RuleForEach(x => x.Items)
            .SetValidator(new CreateOrderItemRequestValidator());

        RuleFor(x => x.ShippingAddress)
            .MaximumLength(500).WithMessage("Shipping address cannot exceed 500 characters.")
            .When(x => x.ShippingAddress != null);

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes cannot exceed 2000 characters.")
            .When(x => x.Notes != null);

        RuleFor(x => x.RequiredByDate)
            .GreaterThan(DateTime.UtcNow.AddDays(1))
            .WithMessage("Required-by date must be at least 1 day in the future.")
            .When(x => x.RequiredByDate != null);
    }
}
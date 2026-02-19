using FluentValidation;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Quotes;

public class CreateQuoteRequestValidator : AbstractValidator<CreateQuoteRequest>
{
    public CreateQuoteRequestValidator()
    {
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be at least 1.")
            .LessThanOrEqualTo(10000).WithMessage("Quantity cannot exceed 10000.");

        RuleFor(x => x.FileId)
            .NotEqual(Guid.Empty).WithMessage("Invalid file ID.")
            .When(x => x.FileId != null);

        RuleFor(x => x.PreferredMaterialId)
            .NotEqual(Guid.Empty).WithMessage("Invalid material ID.")
            .When(x => x.PreferredMaterialId != null);

        RuleFor(x => x.PreferredColor)
            .MaximumLength(50).WithMessage("Color cannot exceed 50 characters.")
            .When(x => x.PreferredColor != null);

        RuleFor(x => x.RequiredByDate)
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Required-by date must be in the future.")
            .When(x => x.RequiredByDate != null);

        RuleFor(x => x.SpecialRequirements)
            .MaximumLength(2000).WithMessage("Special requirements cannot exceed 2000 characters.")
            .When(x => x.SpecialRequirements != null);

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes cannot exceed 2000 characters.")
            .When(x => x.Notes != null);

        RuleFor(x => x.BudgetRange)
            .Must(BeAValidBudgetRange!).WithMessage("Invalid budget range.")
            .When(x => x.BudgetRange != null);

        // Cross-field: if BudgetRange is "Custom", require Min and Max
        RuleFor(x => x.BudgetMin)
            .GreaterThanOrEqualTo(0).WithMessage("Budget minimum cannot be negative.")
            .When(x => x.BudgetMin != null);

        RuleFor(x => x.BudgetMax)
            .GreaterThanOrEqualTo(0).WithMessage("Budget maximum cannot be negative.")
            .When(x => x.BudgetMax != null);

        RuleFor(x => x.BudgetMax)
            .GreaterThan(x => x.BudgetMin ?? 0)
            .WithMessage("Budget maximum must be greater than minimum.")
            .When(x => x.BudgetMin != null && x.BudgetMax != null);
    }

    private static bool BeAValidBudgetRange(string range)
    {
        return Enum.TryParse<BudgetRange>(range, ignoreCase: true, out _);
    }
}
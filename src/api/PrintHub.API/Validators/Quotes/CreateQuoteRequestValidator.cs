using FluentValidation;
using PrintHub.Core.DTOs.Quotes;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Quotes;

public class CreateQuoteRequestValidator : AbstractValidator<CreateQuoteRequest>
{
    private const int MaxFiles = 25;

    public CreateQuoteRequestValidator()
    {
        RuleFor(x => x.Files)
            .NotEmpty().WithMessage("At least one file is required.")
            .Must(files => files.Count <= MaxFiles)
                .WithMessage($"A maximum of {MaxFiles} files may be included in a single quote request.");

        RuleForEach(x => x.Files).SetValidator(new QuoteFileItemRequestValidator());

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
            .Must(BeAValidBudgetRange!).WithMessage("Invalid budget range. Valid values: UnderFifty, FiftyToHundred, HundredToFiveHundred, FiveHundredToThousand, OverThousand, Custom.")
            .When(x => x.BudgetRange != null);

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

    private static bool BeAValidBudgetRange(string range) =>
        Enum.TryParse<BudgetRange>(range, ignoreCase: true, out _);
}

public class QuoteFileItemRequestValidator : AbstractValidator<QuoteFileItemRequest>
{
    public QuoteFileItemRequestValidator()
    {
        RuleFor(x => x.FileId)
            .NotEqual(Guid.Empty).WithMessage("Invalid file ID.");

        RuleFor(x => x.MaterialId)
            .NotEqual(Guid.Empty).WithMessage("Invalid material ID.")
            .When(x => x.MaterialId != null);

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be at least 1.")
            .LessThanOrEqualTo(10000).WithMessage("Quantity cannot exceed 10000.");

        RuleFor(x => x.Color)
            .MaximumLength(100).WithMessage("Color cannot exceed 100 characters.")
            .When(x => x.Color != null);
    }
}

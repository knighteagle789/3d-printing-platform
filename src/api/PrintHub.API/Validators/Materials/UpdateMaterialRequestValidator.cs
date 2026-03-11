using FluentValidation;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Materials;

public class UpdateMaterialRequestValidator : AbstractValidator<UpdateMaterialRequest>
{
    public UpdateMaterialRequestValidator()
    {
        // All fields nullable — only validate when provided

        RuleFor(x => x.Type)
            .Must(BeAValidMaterialType!)
            .WithMessage("Invalid material type. Valid types: PLA, ABS, PETG, TPU, Nylon, Resin, ASA, PolyCarbonate, Metal, Carbon, Wood, Ceramic, Other.")
            .When(x => x.Type != null);

        RuleFor(x => x.Color)
            .Must(c => !string.IsNullOrWhiteSpace(c))
            .WithMessage("Color cannot be empty.")
            .MaximumLength(100).WithMessage("Color cannot exceed 100 characters.")
            .When(x => x.Color != null);

        RuleFor(x => x.Finish)
            .Must(BeAValidFinish!)
            .WithMessage("Invalid finish. Valid values: Standard, Matte, Silk, Glossy.")
            .When(x => x.Finish != null);

        RuleFor(x => x.Grade)
            .Must(BeAValidGrade!)
            .WithMessage("Invalid grade. Valid values: Economy, Standard, Premium.")
            .When(x => x.Grade != null);

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.Brand)
            .MaximumLength(100).WithMessage("Brand cannot exceed 100 characters.")
            .When(x => x.Brand != null);

        RuleFor(x => x.PricePerGram)
            .GreaterThan(0).WithMessage("Price per gram must be greater than zero.")
            .LessThan(1000).WithMessage("Price per gram seems unreasonably high.")
            .When(x => x.PricePerGram != null);

        RuleFor(x => x.StockGrams)
            .GreaterThanOrEqualTo(0).WithMessage("Stock cannot be negative.")
            .When(x => x.StockGrams != null);

        RuleFor(x => x.LowStockThresholdGrams)
            .GreaterThanOrEqualTo(0).WithMessage("Low stock threshold cannot be negative.")
            .When(x => x.LowStockThresholdGrams != null);

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes cannot exceed 1000 characters.")
            .When(x => x.Notes != null);

        RuleFor(x => x.PrintingTechnologyId)
            .NotEqual(Guid.Empty).WithMessage("Invalid printing technology ID.")
            .When(x => x.PrintingTechnologyId != null);
    }

    private static bool BeAValidMaterialType(string type) =>
        Enum.TryParse<MaterialType>(type, ignoreCase: true, out _);

    private static bool BeAValidFinish(string finish) =>
        Enum.TryParse<MaterialFinish>(finish, ignoreCase: true, out _);

    private static bool BeAValidGrade(string grade) =>
        Enum.TryParse<MaterialGrade>(grade, ignoreCase: true, out _);
}
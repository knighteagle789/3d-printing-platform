using FluentValidation;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Materials;

public class CreateMaterialRequestValidator : AbstractValidator<CreateMaterialRequest>
{
    public CreateMaterialRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Material name is required.")
            .MaximumLength(200).WithMessage("Name cannot exceed 200 characters.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required.")
            .MaximumLength(2000).WithMessage("Description cannot exceed 2000 characters.");

        RuleFor(x => x.PricePerGram)
            .GreaterThan(0).WithMessage("Price per gram must be greater than zero.")
            .LessThan(1000).WithMessage("Price per gram seems unreasonably high.");

        RuleFor(x => x.Type)
            .NotEmpty().WithMessage("Material type is required.")
            .Must(BeAValidMaterialType).WithMessage("Invalid material type. Valid types: PLA, ABS, PETG, TPU, Nylon, Resin, Metal, Carbon, Wood, Other.");

        RuleFor(x => x.Properties)
            .MaximumLength(4000).WithMessage("Properties cannot exceed 4000 characters.")
            .When(x => x.Properties != null);

        RuleForEach(x => x.AvailableColors)
            .NotEmpty().WithMessage("Color names cannot be empty.")
            .MaximumLength(50).WithMessage("Color name cannot exceed 50 characters.")
            .When(x => x.AvailableColors != null);

        RuleFor(x => x.PrintingTechnologyId)
            .NotEqual(Guid.Empty).WithMessage("Invalid printing technology ID.")
            .When(x => x.PrintingTechnologyId != null);
    }

    private static bool BeAValidMaterialType(string type)
    {
        return Enum.TryParse<MaterialType>(type, ignoreCase: true, out _);
    }
}
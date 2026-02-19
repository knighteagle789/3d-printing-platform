using FluentValidation;
using PrintHub.Core.DTOs.Materials;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Materials;

public class UpdateMaterialRequestValidator : AbstractValidator<UpdateMaterialRequest>
{
    public UpdateMaterialRequestValidator()
    {
        // All fields are nullable (partial update) — only validate if provided

        RuleFor(x => x.Name)
            .MaximumLength(200).WithMessage("Name cannot exceed 200 characters.")
            .When(x => x.Name != null);

        RuleFor(x => x.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("Name cannot be empty or whitespace.")
            .When(x => x.Name != null);

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description cannot exceed 2000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.PricePerGram)
            .GreaterThan(0).WithMessage("Price per gram must be greater than zero.")
            .LessThan(1000).WithMessage("Price per gram seems unreasonably high.")
            .When(x => x.PricePerGram != null);

        RuleFor(x => x.Type)
            .Must(BeAValidMaterialType!).WithMessage("Invalid material type.")
            .When(x => x.Type != null);

        RuleFor(x => x.PrintingTechnologyId)
            .NotEqual(Guid.Empty).WithMessage("Invalid printing technology ID.")
            .When(x => x.PrintingTechnologyId != null);
    }

    private static bool BeAValidMaterialType(string type)
    {
        return Enum.TryParse<MaterialType>(type, ignoreCase: true, out _);
    }
}
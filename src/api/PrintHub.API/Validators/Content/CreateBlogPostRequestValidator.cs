using FluentValidation;
using PrintHub.Core.DTOs.Content;
using PrintHub.Core.Entities;

namespace PrintHub.API.Validators.Content;

public class CreateBlogPostRequestValidator : AbstractValidator<CreateBlogPostRequest>
{
    public CreateBlogPostRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(300).WithMessage("Title cannot exceed 300 characters.");

        RuleFor(x => x.Summary)
            .NotEmpty().WithMessage("Summary is required.")
            .MaximumLength(1000).WithMessage("Summary cannot exceed 1000 characters.");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content is required.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Category is required.")
            .Must(BeAValidCategory).WithMessage("Invalid blog category.");

        RuleFor(x => x.FeaturedImageUrl)
            .MaximumLength(500).WithMessage("Image URL cannot exceed 500 characters.")
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("Featured image must be a valid URL.")
            .When(x => x.FeaturedImageUrl != null);

        RuleForEach(x => x.Tags)
            .NotEmpty().WithMessage("Tag names cannot be empty.")
            .MaximumLength(50).WithMessage("Tag cannot exceed 50 characters.")
            .Matches("^[a-zA-Z0-9-]+$").WithMessage("Tags can only contain letters, numbers, and hyphens.")
            .When(x => x.Tags != null);

        RuleFor(x => x.PublishedAt)
            .GreaterThan(DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Publish date cannot be in the past.")
            .When(x => x.PublishedAt != null && x.IsPublished);
    }

    private static bool BeAValidCategory(string category)
    {
        return Enum.TryParse<BlogCategory>(category, ignoreCase: true, out _);
    }
}
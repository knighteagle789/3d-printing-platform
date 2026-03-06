using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimelapseVideoUrlToPortfolioItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TimelapseVideoUrl",
                table: "PortfolioItems",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TimelapseVideoUrl",
                table: "PortfolioItems");
        }
    }
}

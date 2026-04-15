using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteRequestFileMaterialIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequestFiles_MaterialId",
                table: "QuoteRequestFiles",
                column: "MaterialId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuoteRequestFiles_MaterialId",
                table: "QuoteRequestFiles");
        }
    }
}

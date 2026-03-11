using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorMaterialEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Materials_Name",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "AvailableColors",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Materials");

            migrationBuilder.RenameColumn(
                name: "Properties",
                table: "Materials",
                newName: "PrintSettings");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Materials",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Materials",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Finish",
                table: "Materials",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Grade",
                table: "Materials",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LowStockThresholdGrams",
                table: "Materials",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Materials",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "StockGrams",
                table: "Materials",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Type_Color",
                table: "Materials",
                columns: new[] { "Type", "Color" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Materials_Type_Color",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Finish",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Grade",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "LowStockThresholdGrams",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "StockGrams",
                table: "Materials");

            migrationBuilder.RenameColumn(
                name: "PrintSettings",
                table: "Materials",
                newName: "Properties");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Materials",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "AvailableColors",
                table: "Materials",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Materials",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name",
                table: "Materials",
                column: "Name");
        }
    }
}

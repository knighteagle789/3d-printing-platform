using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MultiFileQuote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop old single-file foreign keys from QuoteRequests
            migrationBuilder.DropForeignKey(
                name: "FK_QuoteRequests_UploadedFiles_FileId",
                table: "QuoteRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_QuoteRequests_Materials_PreferredMaterialId",
                table: "QuoteRequests");

            // 2. Drop old indexes
            migrationBuilder.DropIndex(
                name: "IX_QuoteRequests_FileId",
                table: "QuoteRequests");

            migrationBuilder.DropIndex(
                name: "IX_QuoteRequests_PreferredMaterialId",
                table: "QuoteRequests");

            // 3. Drop old columns
            migrationBuilder.DropColumn(
                name: "FileId",
                table: "QuoteRequests");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "QuoteRequests");

            migrationBuilder.DropColumn(
                name: "PreferredMaterialId",
                table: "QuoteRequests");

            migrationBuilder.DropColumn(
                name: "PreferredColor",
                table: "QuoteRequests");

            // 4. Add SetupFee column
            migrationBuilder.AddColumn<decimal>(
                name: "SetupFee",
                table: "QuoteRequests",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            // 5. Create QuoteRequestFiles table
            migrationBuilder.CreateTable(
                name: "QuoteRequestFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<Guid>(type: "uuid", nullable: false),
                    MaterialId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Color = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DimensionX = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    DimensionY = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    DimensionZ = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    EstimatedWeightGrams = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    EstimatedPrintTimeHours = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    MaterialCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MachineCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ExceedsBuildVolume = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false,
                        defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuoteRequestFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuoteRequestFiles_QuoteRequests_QuoteRequestId",
                        column: x => x.QuoteRequestId,
                        principalTable: "QuoteRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QuoteRequestFiles_UploadedFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "UploadedFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuoteRequestFiles_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            // 6. Indexes on QuoteRequestFiles
            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequestFiles_QuoteRequestId",
                table: "QuoteRequestFiles",
                column: "QuoteRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequestFiles_FileId",
                table: "QuoteRequestFiles",
                column: "FileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Drop QuoteRequestFiles table (and all its FKs / indexes)
            migrationBuilder.DropTable(
                name: "QuoteRequestFiles");

            // 2. Drop SetupFee
            migrationBuilder.DropColumn(
                name: "SetupFee",
                table: "QuoteRequests");

            // 3. Re-add removed columns
            migrationBuilder.AddColumn<Guid>(
                name: "FileId",
                table: "QuoteRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "QuoteRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "PreferredMaterialId",
                table: "QuoteRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreferredColor",
                table: "QuoteRequests",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // 4. Re-create indexes
            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequests_FileId",
                table: "QuoteRequests",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequests_PreferredMaterialId",
                table: "QuoteRequests",
                column: "PreferredMaterialId");

            // 5. Re-create foreign keys
            migrationBuilder.AddForeignKey(
                name: "FK_QuoteRequests_UploadedFiles_FileId",
                table: "QuoteRequests",
                column: "FileId",
                principalTable: "UploadedFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_QuoteRequests_Materials_PreferredMaterialId",
                table: "QuoteRequests",
                column: "PreferredMaterialId",
                principalTable: "Materials",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}

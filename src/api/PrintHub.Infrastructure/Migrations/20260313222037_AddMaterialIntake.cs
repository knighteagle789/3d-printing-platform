using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialIntake : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialIntakes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PhotoBlobName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PhotoUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    SourceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    UploadNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ExtractionAttemptCount = table.Column<int>(type: "integer", nullable: false),
                    LastExtractionError = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ExtractedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DraftBrand = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DraftMaterialType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DraftColor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DraftSpoolWeightGrams = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DraftPrintSettingsHints = table.Column<string>(type: "jsonb", nullable: true),
                    DraftBatchOrLot = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ConfidenceMap = table.Column<string>(type: "jsonb", nullable: true),
                    ReviewerCorrections = table.Column<string>(type: "jsonb", nullable: true),
                    ApprovedMaterialId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovalOutcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ActionedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialIntakes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialIntakes_Materials_ApprovedMaterialId",
                        column: x => x.ApprovedMaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MaterialIntakes_Users_ActionedByUserId",
                        column: x => x.ActionedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MaterialIntakes_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IntakeEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IntakeId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ToStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Details = table.Column<string>(type: "jsonb", nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeEvents_MaterialIntakes_IntakeId",
                        column: x => x.IntakeId,
                        principalTable: "MaterialIntakes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IntakeEvents_IntakeId",
                table: "IntakeEvents",
                column: "IntakeId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeEvents_OccurredAtUtc",
                table: "IntakeEvents",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialIntakes_ActionedByUserId",
                table: "MaterialIntakes",
                column: "ActionedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialIntakes_ApprovedMaterialId",
                table: "MaterialIntakes",
                column: "ApprovedMaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialIntakes_CreatedAtUtc",
                table: "MaterialIntakes",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialIntakes_Status",
                table: "MaterialIntakes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialIntakes_UploadedByUserId",
                table: "MaterialIntakes",
                column: "UploadedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IntakeEvents");

            migrationBuilder.DropTable(
                name: "MaterialIntakes");
        }
    }
}

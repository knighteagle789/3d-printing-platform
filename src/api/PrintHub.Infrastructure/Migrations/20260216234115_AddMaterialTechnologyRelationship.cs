using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialTechnologyRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrintingTechnologyId",
                table: "Materials",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_PrintingTechnologyId",
                table: "Materials",
                column: "PrintingTechnologyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_PrintingTechnologies_PrintingTechnologyId",
                table: "Materials",
                column: "PrintingTechnologyId",
                principalTable: "PrintingTechnologies",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_PrintingTechnologies_PrintingTechnologyId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_PrintingTechnologyId",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "PrintingTechnologyId",
                table: "Materials");
        }
    }
}

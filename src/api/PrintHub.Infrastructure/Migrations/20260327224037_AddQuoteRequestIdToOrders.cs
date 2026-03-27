using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteRequestIdToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuoteRequestId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_QuoteRequestId",
                table: "Orders",
                column: "QuoteRequestId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_QuoteRequests_QuoteRequestId",
                table: "Orders",
                column: "QuoteRequestId",
                principalTable: "QuoteRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_QuoteRequests_QuoteRequestId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_QuoteRequestId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "QuoteRequestId",
                table: "Orders");
        }
    }
}

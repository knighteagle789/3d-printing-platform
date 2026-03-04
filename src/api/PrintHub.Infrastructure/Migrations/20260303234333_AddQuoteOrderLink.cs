using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteOrderLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OrderId",
                table: "QuoteRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuoteRequests_OrderId",
                table: "QuoteRequests",
                column: "OrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_QuoteRequests_Orders_OrderId",
                table: "QuoteRequests",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuoteRequests_Orders_OrderId",
                table: "QuoteRequests");

            migrationBuilder.DropIndex(
                name: "IX_QuoteRequests_OrderId",
                table: "QuoteRequests");

            migrationBuilder.DropColumn(
                name: "OrderId",
                table: "QuoteRequests");
        }
    }
}

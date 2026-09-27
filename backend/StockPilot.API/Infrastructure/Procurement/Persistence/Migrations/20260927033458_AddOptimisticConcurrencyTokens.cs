using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPilot.Procurement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimisticConcurrencyTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "procurement",
                table: "Budgets",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "procurement",
                table: "ProcurementProposals");

            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "procurement",
                table: "Budgets");
        }
    }
}

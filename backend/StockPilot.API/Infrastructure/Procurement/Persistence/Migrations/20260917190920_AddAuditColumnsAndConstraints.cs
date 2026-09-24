using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPilot.Procurement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditColumnsAndConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "ChangedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalCost",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "LineTotal",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEstimatedCost",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "Budgets",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "SpentAmount",
                schema: "procurement",
                table: "Budgets",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "Budgets",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "AllocatedAmount",
                schema: "procurement",
                table: "Budgets",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "DecidedAt",
                schema: "procurement",
                table: "ApprovalDecisions",
                type: "timestamptz",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "ApprovalDecisions",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ApprovalDecisions",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "ApprovalDecisions",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888881"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "ProposalLineItems",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "ProposalLineItems",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "ProposalLineItems",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-0000-0000-0000-000000000003"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "ProposalLineItems",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-0000-0000-0000-000000000004"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                keyColumn: "Id",
                keyValue: new Guid("bbbbbbbb-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                keyColumn: "Id",
                keyValue: new Guid("bbbbbbbb-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                keyColumn: "Id",
                keyValue: new Guid("cccccccc-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.UpdateData(
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                keyColumn: "Id",
                keyValue: new Guid("cccccccc-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 1, 21, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateTimeOffset(new DateTime(2026, 1, 21, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrderStatusHistory_FromStatus",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                sql: "\"FromStatus\" IS NULL OR \"FromStatus\" IN ('Ordered', 'PartiallyReceived', 'Received', 'Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrderStatusHistory_ToStatus",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                sql: "\"ToStatus\" IN ('Ordered', 'PartiallyReceived', 'Received', 'Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrders_Status",
                schema: "procurement",
                table: "PurchaseOrders",
                sql: "\"Status\" IN ('Ordered', 'PartiallyReceived', 'Received', 'Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProcurementProposals_Status",
                schema: "procurement",
                table: "ProcurementProposals",
                sql: "\"Status\" IN ('Draft', 'PendingApproval', 'Approved', 'Rejected', 'RevisionRequested', 'Converted')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ApprovalDecisions_Decision",
                schema: "procurement",
                table: "ApprovalDecisions",
                sql: "\"Decision\" IN ('Approved', 'Rejected', 'RevisionRequested')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrderStatusHistory_FromStatus",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrderStatusHistory_ToStatus",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrders_Status",
                schema: "procurement",
                table: "PurchaseOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProcurementProposals_Status",
                schema: "procurement",
                table: "ProcurementProposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ApprovalDecisions_Decision",
                schema: "procurement",
                table: "ApprovalDecisions");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrderLineItems");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrderLineItems");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "procurement",
                table: "ProposalLineItems");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ProposalLineItems");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "procurement",
                table: "ApprovalDecisions");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ApprovalDecisions");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "ChangedAt",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalCost",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "PurchaseOrders",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "LineTotal",
                schema: "procurement",
                table: "ProposalLineItems",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEstimatedCost",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "ProcurementProposals",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "procurement",
                table: "Budgets",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<decimal>(
                name: "SpentAmount",
                schema: "procurement",
                table: "Budgets",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "procurement",
                table: "Budgets",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");

            migrationBuilder.AlterColumn<decimal>(
                name: "AllocatedAmount",
                schema: "procurement",
                table: "Budgets",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "DecidedAt",
                schema: "procurement",
                table: "ApprovalDecisions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz");
        }
    }
}

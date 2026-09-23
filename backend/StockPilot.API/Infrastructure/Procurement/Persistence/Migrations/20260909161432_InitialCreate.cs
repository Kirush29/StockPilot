using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace StockPilot.Procurement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "procurement");

            migrationBuilder.CreateTable(
                name: "Budgets",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    AllocatedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SpentAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Budgets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcurementProposals",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuotationId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByAgent = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TotalEstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Justification = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcurementProposals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApprovalDecisions",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProposalId = table.Column<Guid>(type: "uuid", nullable: false),
                    DecidedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Decision = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DecidedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApprovalDecisions_ProcurementProposals_ProposalId",
                        column: x => x.ProposalId,
                        principalSchema: "procurement",
                        principalTable: "ProcurementProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProposalLineItems",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProposalId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProposalLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProposalLineItems_ProcurementProposals_ProposalId",
                        column: x => x.ProposalId,
                        principalSchema: "procurement",
                        principalTable: "ProcurementProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrders",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProposalId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ExpectedDeliveryDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_ProcurementProposals_ProposalId",
                        column: x => x.ProposalId,
                        principalSchema: "procurement",
                        principalTable: "ProcurementProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderLineItems",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderLineItems_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalSchema: "procurement",
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderStatusHistory",
                schema: "procurement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ToStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderStatusHistory_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalSchema: "procurement",
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "Budgets",
                columns: new[] { "Id", "AllocatedAmount", "BranchId", "CreatedAt", "PeriodEnd", "PeriodStart", "SpentAmount", "UpdatedAt" },
                values: new object[] { new Guid("66666666-6666-6666-6666-666666666661"), 500000m, new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateOnly(2026, 12, 31), new DateOnly(2026, 1, 1), 6000m, new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "ProcurementProposals",
                columns: new[] { "Id", "BranchId", "CreatedAt", "CreatedByAgent", "CreatedByUserId", "Justification", "QuotationId", "Status", "SupplierId", "TotalEstimatedCost", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("77777777-7777-7777-7777-777777777771"), new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), false, new Guid("55555555-5555-5555-5555-555555555551"), "Replace worn office chairs at the branch.", null, "Draft", new Guid("22222222-2222-2222-2222-222222222222"), 30000m, new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("77777777-7777-7777-7777-777777777772"), new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), true, new Guid("55555555-5555-5555-5555-555555555552"), "Procurement Coordinator Agent: replenish A4 paper stock ahead of projected shortfall.", new Guid("33333333-3333-3333-3333-333333333333"), "PendingApproval", new Guid("22222222-2222-2222-2222-222222222222"), 25000m, new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("77777777-7777-7777-7777-777777777773"), new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), false, new Guid("55555555-5555-5555-5555-555555555552"), "Quarterly consumables restock.", new Guid("33333333-3333-3333-3333-333333333333"), "Converted", new Guid("22222222-2222-2222-2222-222222222222"), 6000m, new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) }
                });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "ApprovalDecisions",
                columns: new[] { "Id", "Comment", "DecidedAt", "DecidedByUserId", "Decision", "ProposalId" },
                values: new object[] { new Guid("88888888-8888-8888-8888-888888888881"), "Within budget, approved for standing consumables order.", new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("55555555-5555-5555-5555-555555555553"), "Approved", new Guid("77777777-7777-7777-7777-777777777773") });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "ProposalLineItems",
                columns: new[] { "Id", "LineTotal", "ProductId", "ProposalId", "Quantity", "UnitPrice" },
                values: new object[,]
                {
                    { new Guid("aaaaaaaa-0000-0000-0000-000000000001"), 30000m, new Guid("44444444-4444-4444-4444-444444444443"), new Guid("77777777-7777-7777-7777-777777777771"), 2, 15000m },
                    { new Guid("aaaaaaaa-0000-0000-0000-000000000002"), 25000m, new Guid("44444444-4444-4444-4444-444444444441"), new Guid("77777777-7777-7777-7777-777777777772"), 50, 500m },
                    { new Guid("aaaaaaaa-0000-0000-0000-000000000003"), 5000m, new Guid("44444444-4444-4444-4444-444444444441"), new Guid("77777777-7777-7777-7777-777777777773"), 10, 500m },
                    { new Guid("aaaaaaaa-0000-0000-0000-000000000004"), 1000m, new Guid("44444444-4444-4444-4444-444444444442"), new Guid("77777777-7777-7777-7777-777777777773"), 5, 200m }
                });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "PurchaseOrders",
                columns: new[] { "Id", "CreatedAt", "ExpectedDeliveryDate", "OrderNumber", "ProposalId", "Status", "SupplierId", "TotalCost", "UpdatedAt" },
                values: new object[] { new Guid("99999999-9999-9999-9999-999999999991"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new DateOnly(2026, 1, 22), "PO-2026-000001", new Guid("77777777-7777-7777-7777-777777777773"), "Received", new Guid("22222222-2222-2222-2222-222222222222"), 6000m, new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                columns: new[] { "Id", "ProductId", "PurchaseOrderId", "Quantity", "UnitPrice" },
                values: new object[,]
                {
                    { new Guid("bbbbbbbb-0000-0000-0000-000000000001"), new Guid("44444444-4444-4444-4444-444444444441"), new Guid("99999999-9999-9999-9999-999999999991"), 10, 500m },
                    { new Guid("bbbbbbbb-0000-0000-0000-000000000002"), new Guid("44444444-4444-4444-4444-444444444442"), new Guid("99999999-9999-9999-9999-999999999991"), 5, 200m }
                });

            migrationBuilder.InsertData(
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                columns: new[] { "Id", "ChangedAt", "ChangedByUserId", "FromStatus", "Notes", "PurchaseOrderId", "ToStatus" },
                values: new object[,]
                {
                    { new Guid("cccccccc-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2026, 1, 15, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("55555555-5555-5555-5555-555555555552"), null, "Converted from proposal.", new Guid("99999999-9999-9999-9999-999999999991"), "Ordered" },
                    { new Guid("cccccccc-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2026, 1, 21, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), new Guid("55555555-5555-5555-5555-555555555552"), "Ordered", "Delivery received in full.", new Guid("99999999-9999-9999-9999-999999999991"), "Received" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalDecisions_ProposalId",
                schema: "procurement",
                table: "ApprovalDecisions",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_BranchId",
                schema: "procurement",
                table: "Budgets",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_BranchId_PeriodStart_PeriodEnd",
                schema: "procurement",
                table: "Budgets",
                columns: new[] { "BranchId", "PeriodStart", "PeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementProposals_BranchId",
                schema: "procurement",
                table: "ProcurementProposals",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementProposals_Status",
                schema: "procurement",
                table: "ProcurementProposals",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementProposals_SupplierId",
                schema: "procurement",
                table: "ProcurementProposals",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalLineItems_ProductId",
                schema: "procurement",
                table: "ProposalLineItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalLineItems_ProposalId",
                schema: "procurement",
                table: "ProposalLineItems",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLineItems_ProductId",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderLineItems_PurchaseOrderId",
                schema: "procurement",
                table: "PurchaseOrderLineItems",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_OrderNumber",
                schema: "procurement",
                table: "PurchaseOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_ProposalId",
                schema: "procurement",
                table: "PurchaseOrders",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Status",
                schema: "procurement",
                table: "PurchaseOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierId",
                schema: "procurement",
                table: "PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderStatusHistory_PurchaseOrderId",
                schema: "procurement",
                table: "PurchaseOrderStatusHistory",
                column: "PurchaseOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApprovalDecisions",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "Budgets",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "ProposalLineItems",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "PurchaseOrderLineItems",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "PurchaseOrderStatusHistory",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "PurchaseOrders",
                schema: "procurement");

            migrationBuilder.DropTable(
                name: "ProcurementProposals",
                schema: "procurement");
        }
    }
}

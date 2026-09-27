using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPilot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InventorySchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "products",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CostPrice",
                table: "products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MaximumStockLevel",
                table: "products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinimumStockLevel",
                table: "products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReorderLevel",
                table: "products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SellingPrice",
                table: "products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Branches",
                columns: table => new
                {
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ManagerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branches", x => x.BranchId);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.CategoryId);
                });

            migrationBuilder.CreateTable(
                name: "Batches",
                columns: table => new
                {
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ManufacturingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Batches", x => x.BatchId);
                    table.CheckConstraint("CK_Batch_Quantity", "\"Quantity\" >= 0");
                    table.CheckConstraint("CK_Batch_UnitCost", "\"UnitCost\" >= 0");
                    table.ForeignKey(
                        name: "FK_Batches_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Batches_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Inventories",
                columns: table => new
                {
                    InventoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuantityOnHand = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReservedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inventories", x => x.InventoryId);
                    table.CheckConstraint("CK_Inventory_QuantityOnHand", "\"QuantityOnHand\" >= 0");
                    table.CheckConstraint("CK_Inventory_ReservedQuantity", "\"ReservedQuantity\" >= 0");
                    table.ForeignKey(
                        name: "FK_Inventories_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Inventories_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProfileImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Address = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MustChangePassword = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_Users_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "StockMovements",
                columns: table => new
                {
                    StockMovementId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PreviousQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    NewQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MovementType = table.Column<string>(type: "text", nullable: false),
                    ReferenceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferenceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PerformedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockMovements", x => x.StockMovementId);
                    table.CheckConstraint("CK_StockMovement_Quantity", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_StockMovements_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StockMovements_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockMovements_Users_PerformedBy",
                        column: x => x.PerformedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockMovements_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockTransfers",
                columns: table => new
                {
                    StockTransferId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SourceBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RequestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockTransfers", x => x.StockTransferId);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Branches_DestinationBranchId",
                        column: x => x.DestinationBranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Branches_SourceBranchId",
                        column: x => x.SourceBranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StockTransfers_Users_RequestedBy",
                        column: x => x.RequestedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AiRecommendations",
                columns: table => new
                {
                    RecommendationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecommendationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IssueType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceBranchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedTransferId = table.Column<Guid>(type: "uuid", nullable: true),
                    SuggestedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    ConfidenceScore = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    Reasoning = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    RejectionReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    InputSnapshotJson = table.Column<string>(type: "text", nullable: true),
                    RuleVersion = table.Column<string>(type: "text", nullable: true),
                    ModelMetadata = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiRecommendations", x => x.RecommendationId);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Branches_DestinationBranchId",
                        column: x => x.DestinationBranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Branches_SourceBranchId",
                        column: x => x.SourceBranchId,
                        principalTable: "Branches",
                        principalColumn: "BranchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_StockTransfers_CreatedTransferId",
                        column: x => x.CreatedTransferId,
                        principalTable: "StockTransfers",
                        principalColumn: "StockTransferId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Users_ReviewedBy",
                        column: x => x.ReviewedBy,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockTransferItems",
                columns: table => new
                {
                    StockTransferItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    StockTransferId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ApprovedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ShippedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReceivedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockTransferItems", x => x.StockTransferItemId);
                    table.CheckConstraint("CK_TransferItem_RequestedQty", "\"RequestedQuantity\" > 0");
                    table.ForeignKey(
                        name: "FK_StockTransferItems_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_StockTransfers_StockTransferId",
                        column: x => x.StockTransferId,
                        principalTable: "StockTransfers",
                        principalColumn: "StockTransferId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_Barcode",
                table: "products",
                column: "Barcode",
                unique: true,
                filter: "\"Barcode\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_products_CategoryId",
                table: "products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_products_SKU",
                table: "products",
                column: "SKU",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_CostPrice",
                table: "products",
                sql: "\"CostPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_SellingPrice",
                table: "products",
                sql: "\"SellingPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_StockLevels",
                table: "products",
                sql: "\"MinimumStockLevel\" >= 0 AND \"ReorderLevel\" >= 0 AND \"MaximumStockLevel\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_BatchId",
                table: "AiRecommendations",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_CreatedAt",
                table: "AiRecommendations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_CreatedTransferId",
                table: "AiRecommendations",
                column: "CreatedTransferId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_DestinationBranchId_Status",
                table: "AiRecommendations",
                columns: new[] { "DestinationBranchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_IssueType",
                table: "AiRecommendations",
                column: "IssueType");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ProductId_Status",
                table: "AiRecommendations",
                columns: new[] { "ProductId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ReviewedBy",
                table: "AiRecommendations",
                column: "ReviewedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_SourceBranchId",
                table: "AiRecommendations",
                column: "SourceBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_BatchNumber_BranchId",
                table: "Batches",
                columns: new[] { "BatchNumber", "BranchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Batches_BranchId",
                table: "Batches",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_ExpiryDate",
                table: "Batches",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_ProductId",
                table: "Batches",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_BranchCode",
                table: "Branches",
                column: "BranchCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_BranchId",
                table: "Inventories",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_ProductId_BranchId",
                table: "Inventories",
                columns: new[] { "ProductId", "BranchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_BatchId",
                table: "StockMovements",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_BranchId",
                table: "StockMovements",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_CreatedAt",
                table: "StockMovements",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_PerformedBy",
                table: "StockMovements",
                column: "PerformedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_ProductId_BranchId",
                table: "StockMovements",
                columns: new[] { "ProductId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_BatchId",
                table: "StockTransferItems",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_ProductId",
                table: "StockTransferItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_StockTransferId",
                table: "StockTransferItems",
                column: "StockTransferId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_ApprovedBy",
                table: "StockTransfers",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_DestinationBranchId",
                table: "StockTransfers",
                column: "DestinationBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_RequestedBy",
                table: "StockTransfers",
                column: "RequestedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_SourceBranchId",
                table: "StockTransfers",
                column: "SourceBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_Status",
                table: "StockTransfers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_TransferNumber",
                table: "StockTransfers",
                column: "TransferNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_BranchId",
                table: "Users",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_products_Categories_CategoryId",
                table: "products",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "CategoryId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_Categories_CategoryId",
                table: "products");

            migrationBuilder.DropTable(
                name: "AiRecommendations");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Inventories");

            migrationBuilder.DropTable(
                name: "StockMovements");

            migrationBuilder.DropTable(
                name: "StockTransferItems");

            migrationBuilder.DropTable(
                name: "Batches");

            migrationBuilder.DropTable(
                name: "StockTransfers");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_products_Barcode",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_CategoryId",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_SKU",
                table: "products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_CostPrice",
                table: "products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_SellingPrice",
                table: "products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_StockLevels",
                table: "products");

            migrationBuilder.DropColumn(
                name: "Barcode",
                table: "products");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "products");

            migrationBuilder.DropColumn(
                name: "CostPrice",
                table: "products");

            migrationBuilder.DropColumn(
                name: "MaximumStockLevel",
                table: "products");

            migrationBuilder.DropColumn(
                name: "MinimumStockLevel",
                table: "products");

            migrationBuilder.DropColumn(
                name: "ReorderLevel",
                table: "products");

            migrationBuilder.DropColumn(
                name: "SellingPrice",
                table: "products");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "products");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "products",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);
        }
    }
}

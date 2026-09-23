using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPilot.API.Migrations
{
    /// <inheritdoc />
    public partial class ExpandAiRecommendation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_Branches_BranchId",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_BranchId",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_ProductId",
                table: "AiRecommendations");

            migrationBuilder.RenameColumn(
                name: "BranchId",
                table: "AiRecommendations",
                newName: "DestinationBranchId");

            migrationBuilder.RenameColumn(
                name: "ActionedAt",
                table: "AiRecommendations",
                newName: "ReviewedAt");

            migrationBuilder.AddColumn<Guid>(
                name: "BatchId",
                table: "AiRecommendations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedTransferId",
                table: "AiRecommendations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InputSnapshotJson",
                table: "AiRecommendations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IssueType",
                table: "AiRecommendations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ModelMetadata",
                table: "AiRecommendations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "AiRecommendations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "AiRecommendations",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedBy",
                table: "AiRecommendations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RuleVersion",
                table: "AiRecommendations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceBranchId",
                table: "AiRecommendations",
                type: "uuid",
                nullable: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_Batches_BatchId",
                table: "AiRecommendations",
                column: "BatchId",
                principalTable: "Batches",
                principalColumn: "BatchId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_Branches_DestinationBranchId",
                table: "AiRecommendations",
                column: "DestinationBranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_Branches_SourceBranchId",
                table: "AiRecommendations",
                column: "SourceBranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_StockTransfers_CreatedTransferId",
                table: "AiRecommendations",
                column: "CreatedTransferId",
                principalTable: "StockTransfers",
                principalColumn: "StockTransferId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_Users_ReviewedBy",
                table: "AiRecommendations",
                column: "ReviewedBy",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_Batches_BatchId",
                table: "AiRecommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_Branches_DestinationBranchId",
                table: "AiRecommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_Branches_SourceBranchId",
                table: "AiRecommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_StockTransfers_CreatedTransferId",
                table: "AiRecommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_AiRecommendations_Users_ReviewedBy",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_BatchId",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_CreatedAt",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_CreatedTransferId",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_DestinationBranchId_Status",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_IssueType",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_ProductId_Status",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_ReviewedBy",
                table: "AiRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_AiRecommendations_SourceBranchId",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "BatchId",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "CreatedTransferId",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "InputSnapshotJson",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "IssueType",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "ModelMetadata",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "RuleVersion",
                table: "AiRecommendations");

            migrationBuilder.DropColumn(
                name: "SourceBranchId",
                table: "AiRecommendations");

            migrationBuilder.RenameColumn(
                name: "ReviewedAt",
                table: "AiRecommendations",
                newName: "ActionedAt");

            migrationBuilder.RenameColumn(
                name: "DestinationBranchId",
                table: "AiRecommendations",
                newName: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_BranchId",
                table: "AiRecommendations",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ProductId",
                table: "AiRecommendations",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_AiRecommendations_Branches_BranchId",
                table: "AiRecommendations",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "BranchId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

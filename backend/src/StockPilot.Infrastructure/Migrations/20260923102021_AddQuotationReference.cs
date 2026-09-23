using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPilot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotationReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "QuotationReferenceSequence");

            migrationBuilder.AddColumn<string>(
                name: "QuotationReference",
                table: "quotations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    rec RECORD;
                BEGIN
                    FOR rec IN SELECT ""Id"" FROM quotations ORDER BY ""CreatedAt"", ""Id""
                    LOOP
                        UPDATE quotations 
                        SET ""QuotationReference"" = 'QT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('""QuotationReferenceSequence""')::text, 5, '0')
                        WHERE ""Id"" = rec.""Id"";
                    END LOOP;
                END $$;
            ");

            migrationBuilder.AlterColumn<string>(
                name: "QuotationReference",
                table: "quotations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_quotations_QuotationReference",
                table: "quotations",
                column: "QuotationReference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_quotations_QuotationReference",
                table: "quotations");

            migrationBuilder.DropColumn(
                name: "QuotationReference",
                table: "quotations");

            migrationBuilder.DropSequence(
                name: "QuotationReferenceSequence");
        }
    }
}

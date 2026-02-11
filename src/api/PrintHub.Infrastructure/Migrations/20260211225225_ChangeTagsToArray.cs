using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PrintHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChangeTagsToArray : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // PortfolioItems - convert varchar to text[]
            migrationBuilder.Sql(@"
                ALTER TABLE ""PortfolioItems"" 
                ALTER COLUMN ""Tags"" TYPE text[]
                USING string_to_array(""Tags"", ',')
            ");

            // BlogPosts - convert varchar to text[]
            migrationBuilder.Sql(@"
                ALTER TABLE ""BlogPosts"" 
                ALTER COLUMN ""Tags"" TYPE text[]
                USING string_to_array(""Tags"", ',')
            ");

            // Add GIN indexes for fast array searches
            migrationBuilder.Sql(@"
                CREATE INDEX ""IX_PortfolioItems_Tags"" 
                ON ""PortfolioItems"" USING GIN (""Tags"")
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX ""IX_BlogPosts_Tags"" 
                ON ""BlogPosts"" USING GIN (""Tags"")
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop GIN indexes first
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ""IX_PortfolioItems_Tags""
            ");

            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ""IX_BlogPosts_Tags""
            ");

            // Convert text[] back to varchar
            migrationBuilder.Sql(@"
                ALTER TABLE ""PortfolioItems"" 
                ALTER COLUMN ""Tags"" TYPE character varying(500)
                USING array_to_string(""Tags"", ',')
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""BlogPosts"" 
                ALTER COLUMN ""Tags"" TYPE character varying(500)
                USING array_to_string(""Tags"", ',')
            ");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddPayOSInfoToTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CounterAccountBankName",
                table: "Transactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CounterAccountName",
                table: "Transactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CounterAccountNumber",
                table: "Transactions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CounterAccountBankName",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "CounterAccountName",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "CounterAccountNumber",
                table: "Transactions");
        }
    }
}

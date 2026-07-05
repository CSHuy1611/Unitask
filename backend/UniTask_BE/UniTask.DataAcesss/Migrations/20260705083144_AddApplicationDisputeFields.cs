using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationDisputeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisputeReason",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DisputedDate",
                table: "Applications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerEvidenceText",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerEvidenceUrl",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentEvidenceText",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentEvidenceUrl",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisputeReason",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "DisputedDate",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "EmployerEvidenceText",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "EmployerEvidenceUrl",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "StudentEvidenceText",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "StudentEvidenceUrl",
                table: "Applications");
        }
    }
}

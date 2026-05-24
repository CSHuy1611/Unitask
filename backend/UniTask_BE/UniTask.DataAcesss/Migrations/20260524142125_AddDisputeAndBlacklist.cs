using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddDisputeAndBlacklist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisputeReason",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DisputedDate",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerEvidenceText",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerEvidenceUrl",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentEvidenceText",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentEvidenceUrl",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BlacklistCount",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisputeReason",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "DisputedDate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EmployerEvidenceText",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EmployerEvidenceUrl",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "StudentEvidenceText",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "StudentEvidenceUrl",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "BlacklistCount",
                table: "AspNetUsers");
        }
    }
}

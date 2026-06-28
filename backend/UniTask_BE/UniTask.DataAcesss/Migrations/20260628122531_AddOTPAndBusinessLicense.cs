using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddOTPAndBusinessLicense : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessLicenseUrl",
                table: "EmployerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBusinessLicenseVerified",
                table: "EmployerProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OtpCode",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OtpExpiryTime",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessLicenseUrl",
                table: "EmployerProfiles");

            migrationBuilder.DropColumn(
                name: "IsBusinessLicenseVerified",
                table: "EmployerProfiles");

            migrationBuilder.DropColumn(
                name: "OtpCode",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OtpExpiryTime",
                table: "AspNetUsers");
        }
    }
}

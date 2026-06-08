using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddReliabilityCheckinRatings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReliabilityScore",
                table: "StudentProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CheckInOtp",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckInOtpExpiredAt",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckInTime",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckOutOtp",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckOutOtpExpiredAt",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckOutTime",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerToStudentComment",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmployerToStudentRating",
                table: "Jobs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerToStudentTags",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowReleaseDate",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequiredReliabilityScore",
                table: "Jobs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "StudentToEmployerComment",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StudentToEmployerRating",
                table: "Jobs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentToEmployerTags",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FlagReason",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFlagged",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReliabilityScore",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "CheckInOtp",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckInOtpExpiredAt",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckInTime",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckOutOtp",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckOutOtpExpiredAt",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckOutTime",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EmployerToStudentComment",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EmployerToStudentRating",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EmployerToStudentTags",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "EscrowReleaseDate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RequiredReliabilityScore",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "StudentToEmployerComment",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "StudentToEmployerRating",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "StudentToEmployerTags",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "FlagReason",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsFlagged",
                table: "AspNetUsers");
        }
    }
}

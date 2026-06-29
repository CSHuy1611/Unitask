using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class UpdateJobToMultipleStudents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_AspNetUsers_SelectedStudentId",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_SelectedStudentId",
                table: "Jobs");

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
                name: "EscrowReleaseDate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SelectedStudentId",
                table: "Jobs");

            migrationBuilder.AddColumn<int>(
                name: "HeadCount",
                table: "Jobs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CheckInOtp",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckInOtpExpiredAt",
                table: "Applications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckInTime",
                table: "Applications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckOutOtp",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckOutOtpExpiredAt",
                table: "Applications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckOutTime",
                table: "Applications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowReleaseDate",
                table: "Applications",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HeadCount",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CheckInOtp",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CheckInOtpExpiredAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CheckInTime",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CheckOutOtp",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CheckOutOtpExpiredAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CheckOutTime",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "EscrowReleaseDate",
                table: "Applications");

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

            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowReleaseDate",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelectedStudentId",
                table: "Jobs",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_SelectedStudentId",
                table: "Jobs",
                column: "SelectedStudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_AspNetUsers_SelectedStudentId",
                table: "Jobs",
                column: "SelectedStudentId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}

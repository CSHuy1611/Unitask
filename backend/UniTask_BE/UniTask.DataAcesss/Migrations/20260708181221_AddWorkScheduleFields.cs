using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkScheduleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WorkDays",
                table: "Jobs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "WorkEndTime",
                table: "Jobs",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "WorkStartTime",
                table: "Jobs",
                type: "time",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkDays",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "WorkEndTime",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "WorkStartTime",
                table: "Jobs");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniTask.DataAcesss.Migrations
{
    /// <inheritdoc />
    public partial class AutoRejectAndWorkDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "WorkDate",
                table: "Jobs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectReason",
                table: "Applications",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkDate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RejectReason",
                table: "Applications");
        }
    }
}

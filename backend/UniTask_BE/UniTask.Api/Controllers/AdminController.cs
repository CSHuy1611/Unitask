using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniTask.Business.DTOs.Admin;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IProfileService _profileService;
        private readonly IAdminService _adminService;

        public AdminController(IProfileService profileService, IAdminService adminService)
        {
            _profileService = profileService;
            _adminService = adminService;
        }

        // ===== DASHBOARD =====
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        // ===== EKYC MANAGEMENT =====
        [HttpGet("ekyc/pending")]
        public async Task<IActionResult> GetPendingEkyc()
        {
            var pending = await _profileService.GetPendingEkycAsync();
            return Ok(pending);
        }

        [HttpPut("ekyc/{userId}/approve")]
        public async Task<IActionResult> ApproveEkyc(string userId)
        {
            var result = await _profileService.ApproveEkycAsync(userId);
            if (!result) return BadRequest(new { message = "Failed to approve eKYC." });
            return Ok(new { message = "eKYC approved successfully." });
        }

        [HttpPut("ekyc/{userId}/reject")]
        public async Task<IActionResult> RejectEkyc(string userId)
        {
            var result = await _profileService.RejectEkycAsync(userId);
            if (!result) return BadRequest(new { message = "Failed to reject eKYC." });
            return Ok(new { message = "eKYC rejected successfully." });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var users = await _adminService.GetAllUsersAsync(page, pageSize);
            return Ok(users);
        }

        [HttpPost("users/{userId}/force-verify")]
        public async Task<IActionResult> ForceVerifyUser(string userId)
        {
            var result = await _adminService.ForceVerifyUserAsync(userId);
            if (!result) return BadRequest(new { message = "Failed to force verify user." });
            return Ok(new { message = "User verified successfully for testing." });
        }

        [HttpPut("users/{userId}/email")]
        public async Task<IActionResult> UpdateUserEmail(string userId, [FromBody] AdminUserUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _adminService.UpdateUserEmailAsync(userId, dto.Email);
            if (!result) return BadRequest(new { message = "Failed to update user email." });
            return Ok(new { message = "User email updated successfully." });
        }

        [HttpPut("users/{userId}/ban")]
        public async Task<IActionResult> BanUser(string userId)
        {
            var result = await _adminService.BanUserAsync(userId);
            if (!result) return BadRequest(new { message = "Failed to update user ban status." });
            return Ok(new { message = "User ban status updated successfully." });
        }

        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            var result = await _adminService.DeleteUserAsync(userId);
            if (!result) return BadRequest(new { message = "Không thể xóa người dùng này vì họ đã có giao dịch hoặc công việc trên hệ thống." });
            return Ok(new { message = "User deleted successfully." });
        }


        // ===== PACKAGE MANAGEMENT =====
        [HttpPost("packages")]
        public async Task<IActionResult> CreatePackage([FromBody] ServicePackageCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var package = await _adminService.CreatePackageAsync(dto);
            return Ok(package);
        }

        [HttpPut("packages/{id}")]
        public async Task<IActionResult> UpdatePackage(int id, [FromBody] ServicePackageUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _adminService.UpdatePackageAsync(id, dto);
            if (!result) return NotFound(new { message = "Package not found." });
            return Ok(new { message = "Package updated successfully." });
        }

        [HttpDelete("packages/{id}")]
        public async Task<IActionResult> DeletePackage(int id)
        {
            var result = await _adminService.DeletePackageAsync(id);
            if (!result) return NotFound(new { message = "Package not found." });
            return Ok(new { message = "Package deleted (deactivated) successfully." });
        }

        // ===== WITHDRAWAL MANAGEMENT =====
        [HttpGet("withdrawals")]
        public async Task<IActionResult> GetWithdrawals([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var withdrawals = await _adminService.GetWithdrawalsAsync(page, pageSize);
            return Ok(withdrawals);
        }

        [HttpPut("withdrawals/{id}/complete")]
        public async Task<IActionResult> CompleteWithdrawal(int id)
        {
            var result = await _adminService.CompleteWithdrawalAsync(id);
            if (!result) return BadRequest(new { message = "Failed to mark withdrawal as completed." });
            return Ok(new { message = "Withdrawal marked as completed successfully." });
        }

        [HttpPut("withdrawals/{id}/reject")]
        public async Task<IActionResult> RejectWithdrawal(int id, [FromBody] WithdrawalRejectDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _adminService.RejectWithdrawalAsync(id, dto.Reason);
            if (!result) return BadRequest(new { message = "Failed to reject withdrawal." });
            return Ok(new { message = "Withdrawal rejected successfully and funds refunded." });
        }

        [HttpPost("withdrawals/batch-process")]
        public async Task<IActionResult> BatchProcessWithdrawals()
        {
            var result = await _adminService.BatchProcessWithdrawalsAsync();
            if (!result) return BadRequest(new { message = "Failed to batch process withdrawals." });
            return Ok(new { message = "Withdrawals batch processed successfully." });
        }

        // ===== DISPUTE MANAGEMENT =====
        [HttpGet("disputes")]
        public async Task<IActionResult> GetDisputes([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var disputes = await _adminService.GetDisputesAsync(page, pageSize);
            return Ok(disputes);
        }

        [HttpPost("disputes/{id}/resolve")]
        public async Task<IActionResult> ResolveDispute(int id, [FromBody] DisputeResolveDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _adminService.ResolveDisputeAsync(id, dto);
            if (!result) return BadRequest(new { message = "Failed to resolve dispute. Job might not be in Disputed status." });
            return Ok(new { message = "Dispute resolved successfully." });
        }

        // ===== REVENUE & TRANSACTIONS =====
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? type = null)
        {
            var result = await _adminService.GetTransactionsAsync(page, pageSize, type);
            return Ok(result);
        }

        [HttpGet("transactions/export")]
        public async Task<IActionResult> ExportRevenueReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var excelBytes = await _adminService.ExportRevenueReportExcelAsync(startDate, endDate);
            var fileName = $"RevenueReport_{DateTime.Now:yyyyMMddHHmmss}.xlsx";
            return File(excelBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("payos-deposits")]
        public async Task<IActionResult> GetPayosDeposits([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var logs = await _adminService.GetPayosDepositsAsync(page, pageSize);
            return Ok(logs);
        }

        [HttpGet("escrow-logs")]
        public async Task<IActionResult> GetEscrowLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var logs = await _adminService.GetEscrowLogsAsync(page, pageSize);
            return Ok(logs);
        }

        // ===== BUSINESS LICENSE MANAGEMENT =====
        [HttpGet("business-licenses/pending")]
        public async Task<IActionResult> GetPendingBusinessLicenses()
        {
            var pending = await _profileService.GetPendingBusinessLicensesAsync();
            return Ok(pending);
        }

        [HttpPut("business-licenses/{userId}/approve")]
        public async Task<IActionResult> ApproveBusinessLicense(string userId)
        {
            var result = await _profileService.ApproveBusinessLicenseAsync(userId);
            if (!result) return BadRequest(new { message = "Không tìm thấy hồ sơ hoặc giấy phép kinh doanh chưa được upload." });
            return Ok(new { message = "Giấy phép kinh doanh đã được phê duyệt. Employer có thể đăng tin tuyển dụng." });
        }

        [HttpPut("business-licenses/{userId}/reject")]
        public async Task<IActionResult> RejectBusinessLicense(string userId)
        {
            var result = await _profileService.RejectBusinessLicenseAsync(userId);
            if (!result) return BadRequest(new { message = "Không tìm thấy hồ sơ Employer." });
            return Ok(new { message = "Giấy phép kinh doanh đã bị từ chối và xóa. Employer cần upload lại." });
        }

        // ===== MOCK DATA SEEDER =====
        [AllowAnonymous]
        [HttpPost("seed-demo-data")]
        public async Task<IActionResult> SeedDemoData([FromServices] IServiceProvider serviceProvider)
        {
            try
            {
                await UniTask.DataAcesss.MockDataSeeder.SeedMockDataAsync(serviceProvider);
                return Ok(new { message = "Mock data generated successfully (40 Students, 10 Employers, 20+ Jobs). Passwords for all users: Demo@2026" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to generate mock data.", error = ex.Message });
            }
        }
    }
}

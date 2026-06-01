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
    }
}

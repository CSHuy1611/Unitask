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
    }
}

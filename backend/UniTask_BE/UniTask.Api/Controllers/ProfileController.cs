using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.DTOs.Profile;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var profile = await _profileService.GetProfileAsync(userId);
            if (profile == null) return NotFound();

            return Ok(profile);
        }

        [HttpPut("student")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UpdateStudentProfile([FromForm] StudentProfileUpdateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _profileService.UpdateStudentProfileAsync(userId, dto);
            if (!result) return BadRequest(new { message = "Failed to update profile" });

            return Ok(new { message = "Profile updated successfully" });
        }

        [HttpPut("employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateEmployerProfile([FromForm] EmployerProfileUpdateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _profileService.UpdateEmployerProfileAsync(userId, dto);
            if (!result) return BadRequest(new { message = "Failed to update profile" });

            return Ok(new { message = "Profile updated successfully" });
        }

        [HttpPut("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateAdminProfile([FromForm] AdminProfileUpdateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _profileService.UpdateAdminProfileAsync(userId, dto);
                if (!result) return BadRequest(new { message = "Failed to update profile" });

                return Ok(new { message = "Profile updated successfully" });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("ekyc")]
        public async Task<IActionResult> UpdateEkyc([FromForm] EkycUpdateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _profileService.UpdateEkycAsync(userId, dto);
                if (!result) return BadRequest(new { message = "Failed to submit eKYC" });

                return Ok(new { message = "eKYC documents submitted for review" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("student/cv")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UploadCv(IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (file == null || file.Length == 0) return BadRequest(new { message = "File is required." });

            var url = await _profileService.UploadCvAsync(userId, file);
            if (url == null) return BadRequest(new { message = "Failed to upload CV." });

            return Ok(new { message = "CV uploaded successfully.", cvUrl = url });
        }

        [HttpDelete("student/cv")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> DeleteCv()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _profileService.DeleteCvAsync(userId);
            if (!result) return BadRequest(new { message = "No CV found or failed to delete CV." });

            return Ok(new { message = "CV deleted successfully." });
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.DTOs.Application;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ApplicationController : ControllerBase
    {
        private readonly IApplicationService _applicationService;

        public ApplicationController(IApplicationService applicationService)
        {
            _applicationService = applicationService;
        }

        [HttpPost("{jobId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> Apply(int jobId, [FromBody] ApplicationCreateDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            try
            {
                var application = await _applicationService.ApplyJobAsync(jobId, studentId, dto);
                
                if (application == null)
                    return BadRequest(new { message = "Failed to apply. Job might be closed or you already applied." });

                return Ok(application);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("job/{jobId}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GetJobApplications(int jobId)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var applications = await _applicationService.GetApplicationsForJobAsync(jobId, employerId);
            return Ok(applications);
        }

        [HttpGet("my")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyApplications()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var applications = await _applicationService.GetStudentApplicationsAsync(studentId);
            return Ok(applications);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] ApplicationStatusUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var success = await _applicationService.UpdateApplicationStatusAsync(id, employerId, dto.Status);
            if (!success) return BadRequest(new { message = "Failed to update status. Application not found or unauthorized." });

            return Ok(new { message = "Status updated successfully" });
        }

        [HttpPost("{id}/generate-otp")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GenerateOtp(int id, [FromQuery] string type)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var otp = await _applicationService.GenerateOtpAsync(id, employerId, type);
            if (otp == null) return BadRequest(new { message = "Không thể tạo mã OTP. Vui lòng thử lại." });

            return Ok(new { otp });
        }

        [HttpPost("{id}/checkin")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] ApplicationOtpDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var success = await _applicationService.StudentCheckInAsync(id, studentId, dto.Otp);
            if (!success) return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });

            return Ok(new { message = "Check-in thành công." });
        }

        [HttpPost("{id}/checkout")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> CheckOut(int id, [FromBody] ApplicationOtpDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var success = await _applicationService.StudentCheckOutAsync(id, studentId, dto.Otp);
            if (!success) return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });

            return Ok(new { message = "Check-out thành công. Đang chờ nghiệm thu." });
        }

        [HttpPost("{id}/report-noshow")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> ReportNoShow(int id, [FromBody] ReportNoShowDto dto)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var success = await _applicationService.ReportNoShowAsync(id, employerId, dto.Reason, dto.EvidenceUrl);
            if (!success) return BadRequest(new { message = "Không thể báo cáo vắng mặt." });

            return Ok(new { message = "Báo cáo thành công. Hệ thống đã lưu lại." });
        }

        [HttpPost("{id}/approve-completion")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> ApproveCompletion(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var success = await _applicationService.ApproveCompletionAsync(id, employerId);
            if (!success) return BadRequest(new { message = "Không thể nghiệm thu." });

            return Ok(new { message = "Nghiệm thu thành công. Tiền đã được chuyển." });
        }
    }

    public class ApplicationOtpDto
    {
        public string Otp { get; set; } = string.Empty;
    }

    public class ReportNoShowDto
    {
        public string Reason { get; set; } = string.Empty;
        public string EvidenceUrl { get; set; } = string.Empty;
    }
}

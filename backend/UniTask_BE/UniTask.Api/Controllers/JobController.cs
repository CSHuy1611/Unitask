using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using UniTask.Business.DTOs.Job;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class JobController : ControllerBase
    {
        private readonly IJobService _jobService;

        public JobController(IJobService jobService)
        {
            _jobService = jobService;
        }

        [HttpGet]
        public async Task<IActionResult> GetJobs([FromQuery] JobFilterDto filter)
        {
            var jobs = await _jobService.GetJobsAsync(filter);
            return Ok(jobs);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetJobById(int id)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var job = await _jobService.GetJobByIdAsync(id, currentUserId);
            if (job == null) return NotFound();
            return Ok(job);
        }

        [HttpPost]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> CreateJob([FromBody] JobCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            try
            {
                var job = await _jobService.CreateJobAsync(employerId, dto);
                if (job == null) return BadRequest(new { message = "Vui lòng hoàn thiện hồ sơ doanh nghiệp trước khi đăng tin." });

                return CreatedAtAction(nameof(GetJobById), new { id = job.Id }, job);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/start")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> StartJob(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            try
            {
                var result = await _jobService.StartJobAsync(id, employerId);
                return Ok(new { message = "Công việc đã được bắt đầu thành công." });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> UpdateJob(int id, [FromBody] JobUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var result = await _jobService.UpdateJobAsync(id, employerId, dto);
            if (!result) return NotFound(new { message = "Job not found or you don't have permission to edit it." });

            return Ok(new { message = "Job updated successfully" });
        }

        [HttpPut("{id}/report-completion")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ReportCompletion(int id)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _jobService.ReportCompletionAsync(id, studentId);
            if (!result) return BadRequest(new { message = "Cannot report completion. Job might not be in progress or you are not assigned." });

            return Ok(new { message = "Job reported as completed, waiting for employer confirmation." });
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> ApproveJob(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var result = await _jobService.ApproveJobAsync(id, employerId);
            if (!result) return BadRequest(new { message = "Cannot approve job. Job might not be pending confirmation or you lack permission." });

            return Ok(new { message = "Job approved and payment transferred to student." });
        }

        [HttpPut("{id}/approve-debug")]
        [AllowAnonymous]
        public async Task<IActionResult> ApproveJobDebug(int id)
        {
            var result = await _jobService.ApproveJobAsync(id, "485beccd-8e1d-49d5-a6ec-564d6fa54580");
            return Ok(new { success = result, message = "Debug Approve" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> DeleteJob(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var result = await _jobService.DeleteJobAsync(id, employerId);
            if (!result) return NotFound(new { message = "Job not found or you don't have permission to delete it." });

            return Ok(new { message = "Job deleted successfully" });
        }

        [HttpPut("{id}/reject-completion")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> RejectCompletion(int id, [FromBody] JobDisputeCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var result = await _jobService.RejectCompletionAsync(id, employerId, dto);
            if (!result) return BadRequest(new { message = "Cannot dispute job. Job might not be pending confirmation or you lack permission." });

            return Ok(new { message = "Job reported as disputed. Dispute registered." });
        }

        [HttpPut("{id}/student-evidence")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitStudentEvidence(int id, [FromBody] StudentEvidenceSubmitDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _jobService.SubmitStudentEvidenceAsync(id, studentId, dto);
            if (!result) return BadRequest(new { message = "Cannot submit evidence. Job might not be disputed or you are not the assigned student." });

            return Ok(new { message = "Evidence submitted successfully." });
        }

        [HttpPost("{id}/dispute/student")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StudentDispute(int id, [FromBody] JobDisputeCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _jobService.StudentDisputeAsync(id, studentId, dto);
            if (!result) return BadRequest(new { message = "Cannot dispute job. Job might not be in progress or you are not the assigned student." });

            return Ok(new { message = "Job reported as disputed. Dispute registered." });
        }

        [HttpPost("{id}/checkin-otp")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GenerateCheckInOtp(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var otp = await _jobService.GenerateCheckInOtpAsync(id, employerId);
            if (otp == null) return BadRequest(new { message = "Không thể tạo OTP. Công việc phải đang thực hiện." });

            return Ok(new { otp });
        }

        [HttpPost("{id}/checkout-otp")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> GenerateCheckOutOtp(int id)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var otp = await _jobService.GenerateCheckOutOtpAsync(id, employerId);
            if (otp == null) return BadRequest(new { message = "Không thể tạo OTP. Công việc phải đang thực hiện." });

            return Ok(new { otp });
        }

        [HttpPost("{id}/checkin")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StudentCheckIn(int id, [FromBody] OtpDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _jobService.StudentCheckInAsync(id, studentId, dto.Otp);
            if (!result) return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });

            return Ok(new { message = "Check-in thành công." });
        }

        [HttpPost("{id}/checkout")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StudentCheckOut(int id, [FromBody] OtpDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _jobService.StudentCheckOutAsync(id, studentId, dto.Otp);
            if (!result) return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });

            return Ok(new { message = "Check-out thành công. Tiền công đã chuyển vào trạng thái giữ (Escrow)." });
        }

        [HttpPost("{id}/cancel-booking")]
        [Authorize]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _jobService.CancelJobBookingAsync(id, userId);
            if (!result) return BadRequest(new { message = "Không thể hủy lịch nhận việc." });

            return Ok(new { message = "Hủy lịch hẹn thành công." });
        }

        [HttpPost("{id}/review/employer")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> SubmitEmployerReview(int id, [FromBody] ReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            var tagsJson = System.Text.Json.JsonSerializer.Serialize(dto.Tags);
            var result = await _jobService.SubmitEmployerReviewAsync(id, employerId, dto.Rating, tagsJson, dto.Comment);
            if (!result) return BadRequest(new { message = "Không thể lưu đánh giá." });

            return Ok(new { message = "Gửi đánh giá thành công." });
        }

        [HttpPost("{id}/review/student")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitStudentReview(int id, [FromBody] ReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var tagsJson = System.Text.Json.JsonSerializer.Serialize(dto.Tags);
            var result = await _jobService.SubmitStudentReviewAsync(id, studentId, dto.Rating, tagsJson, dto.Comment);
            if (!result) return BadRequest(new { message = "Không thể lưu đánh giá." });

            return Ok(new { message = "Gửi đánh giá thành công." });
        }
    }

    public class OtpDto
    {
        [Required]
        public string Otp { get; set; } = string.Empty;
    }

    public class ReviewDto
    {
        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }
        public List<string> Tags { get; set; } = new();
        public string? Comment { get; set; }
    }
}

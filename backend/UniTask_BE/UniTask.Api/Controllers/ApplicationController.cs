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
    }
}

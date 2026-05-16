using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
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
            var job = await _jobService.GetJobByIdAsync(id);
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

            var job = await _jobService.CreateJobAsync(employerId, dto);
            if (job == null) return BadRequest(new { message = "Failed to create job. Please complete your employer profile first." });

            return CreatedAtAction(nameof(GetJobById), new { id = job.Id }, job);
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
    }
}

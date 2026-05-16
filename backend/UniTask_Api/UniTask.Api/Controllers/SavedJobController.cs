using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Student")]
    public class SavedJobController : ControllerBase
    {
        private readonly ISavedJobService _savedJobService;

        public SavedJobController(ISavedJobService savedJobService)
        {
            _savedJobService = savedJobService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSavedJobs()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var jobs = await _savedJobService.GetSavedJobsAsync(studentId);
            return Ok(jobs);
        }

        [HttpPost("{jobId}")]
        public async Task<IActionResult> SaveJob(int jobId)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _savedJobService.SaveJobAsync(studentId, jobId);
            if (!result) return BadRequest(new { message = "Failed to save job." });

            return Ok(new { message = "Job saved successfully." });
        }

        [HttpDelete("{jobId}")]
        public async Task<IActionResult> UnsaveJob(int jobId)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var result = await _savedJobService.UnsaveJobAsync(studentId, jobId);
            if (!result) return BadRequest(new { message = "Failed to unsave job." });

            return Ok(new { message = "Job unsaved successfully." });
        }

        [HttpGet("{jobId}/check")]
        public async Task<IActionResult> CheckIsSaved(int jobId)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (studentId == null) return Unauthorized();

            var isSaved = await _savedJobService.IsJobSavedAsync(studentId, jobId);
            return Ok(new { isSaved });
        }
    }
}

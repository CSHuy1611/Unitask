using Microsoft.AspNetCore.Mvc;
using UniTask.Business.DTOs.Auth;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly Microsoft.AspNetCore.Identity.UserManager<UniTask.DataAcesss.Entities.ApplicationUser> _userManager;
        private readonly UniTask.DataAcesss.AppDbContext _dbContext;

        public AccountController(
            IAuthService authService,
            Microsoft.AspNetCore.Identity.UserManager<UniTask.DataAcesss.Entities.ApplicationUser> userManager,
            UniTask.DataAcesss.AppDbContext dbContext)
        {
            _authService = authService;
            _userManager = userManager;
            _dbContext = dbContext;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _authService.LoginAsync(request);

            if (!response.IsSuccess)
            {
                return Unauthorized(new { message = response.Message });
            }

            return Ok(response);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _authService.RegisterAsync(request);

            if (!response.IsSuccess)
            {
                return BadRequest(new { message = response.Message });
            }

            return Ok(response);
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _authService.VerifyOtpAsync(request);

            if (!response.IsSuccess)
            {
                return BadRequest(new { message = response.Message });
            }

            return Ok(response);
        }

        [HttpDelete("delete/{email}")]
        public async Task<IActionResult> DeleteAccount(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return NotFound(new { message = "User not found" });

            // Delete Employer related records
            var employerProfile = _dbContext.EmployerProfiles.FirstOrDefault(p => p.UserId == user.Id);
            if (employerProfile != null)
            {
                // Delete all jobs posted by this employer first to satisfy FK constraints
                var jobs = _dbContext.Jobs.Where(j => j.EmployerId == user.Id).ToList();
                if (jobs.Any())
                {
                    _dbContext.Jobs.RemoveRange(jobs);
                }

                _dbContext.EmployerProfiles.Remove(employerProfile);
                if (employerProfile.CompanyId.HasValue)
                {
                    var company = _dbContext.Companies.Find(employerProfile.CompanyId.Value);
                    if (company != null) _dbContext.Companies.Remove(company);
                }
            }

            // Delete Student related records
            var studentProfile = _dbContext.StudentProfiles.FirstOrDefault(p => p.UserId == user.Id);
            if (studentProfile != null)
            {
                // Delete all applications and saved jobs to satisfy FK constraints
                var applications = _dbContext.Applications.Where(a => a.StudentProfileId == studentProfile.Id).ToList();
                if (applications.Any()) _dbContext.Applications.RemoveRange(applications);

                var savedJobs = _dbContext.SavedJobs.Where(sj => sj.StudentProfileId == studentProfile.Id).ToList();
                if (savedJobs.Any()) _dbContext.SavedJobs.RemoveRange(savedJobs);

                _dbContext.StudentProfiles.Remove(studentProfile);
            }

            await _dbContext.SaveChangesAsync();

            // Delete user
            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded) return Ok(new { message = $"Account {email} deleted successfully" });
            
            return BadRequest(new { message = "Failed to delete account", errors = result.Errors });
        }
    }
}

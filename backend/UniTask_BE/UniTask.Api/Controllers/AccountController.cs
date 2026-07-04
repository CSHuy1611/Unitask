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

            // Delete related EmployerProfile and Company if any
            var employerProfile = _dbContext.EmployerProfiles.FirstOrDefault(p => p.UserId == user.Id);
            if (employerProfile != null)
            {
                _dbContext.EmployerProfiles.Remove(employerProfile);
                if (employerProfile.CompanyId.HasValue)
                {
                    var company = _dbContext.Companies.Find(employerProfile.CompanyId.Value);
                    if (company != null) _dbContext.Companies.Remove(company);
                }
            }

            // Delete StudentProfile if any
            var studentProfile = _dbContext.StudentProfiles.FirstOrDefault(p => p.UserId == user.Id);
            if (studentProfile != null) _dbContext.StudentProfiles.Remove(studentProfile);

            await _dbContext.SaveChangesAsync();

            // Delete user
            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded) return Ok(new { message = $"Account {email} deleted successfully" });
            
            return BadRequest(new { message = "Failed to delete account", errors = result.Errors });
        }
    }
}

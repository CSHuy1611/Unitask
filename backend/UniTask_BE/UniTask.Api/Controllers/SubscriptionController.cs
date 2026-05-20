using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;

        public SubscriptionController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }

        [HttpGet("packages")]
        public async Task<IActionResult> GetPackages()
        {
            var packages = await _subscriptionService.GetPackagesAsync();
            return Ok(packages);
        }

        [HttpPost("subscribe/{packageId}")]
        [Authorize(Roles = "Employer")]
        public async Task<IActionResult> Subscribe(int packageId)
        {
            var employerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (employerId == null) return Unauthorized();

            try
            {
                var result = await _subscriptionService.SubscribeAsync(employerId, packageId);
                if (!result) return BadRequest(new { message = "Gói dịch vụ không tồn tại hoặc đã bị khóa." });

                return Ok(new { message = "Đăng ký gói dịch vụ thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}

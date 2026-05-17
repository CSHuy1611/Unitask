using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.DTOs.Payment;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Employer,Admin")] // Typically employers top up wallet
        public async Task<IActionResult> CreatePaymentLink([FromBody] PaymentCreateRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Lấy domain hiện tại để config cancel/return URL (hoặc lấy từ frontend gửi lên)
            var domain = $"{Request.Scheme}://{Request.Host}";
            // Trong thực tế, bạn có thể truyền domain của Angular app vào (VD: http://localhost:4200)
            domain = "http://localhost:4200"; // Hardcode for local testing MVP

            try
            {
                var result = await _paymentService.CreatePaymentLinkAsync(userId, dto, domain);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook([FromBody] global::PayOS.Models.Webhooks.Webhook webhookBody)
        {
            // Endpoint này được gọi từ PayOS Server
            var success = await _paymentService.VerifyPaymentWebhookAsync(webhookBody);
            
            if (success)
            {
                return Ok(new { success = true });
            }

            return BadRequest(new { success = false });
        }
    }
}

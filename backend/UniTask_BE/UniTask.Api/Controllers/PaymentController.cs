using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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
        private readonly IConfiguration _configuration;

        public PaymentController(IPaymentService paymentService, IConfiguration configuration)
        {
            _paymentService = paymentService;
            _configuration = configuration;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Employer,Admin")] // Typically employers top up wallet
        public async Task<IActionResult> CreatePaymentLink([FromBody] PaymentCreateRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Lấy domain từ header Origin của request (tự động nhận diện chính xác cho cả local và production)
            var domain = Request.Headers["Origin"].ToString();
            if (string.IsNullOrEmpty(domain))
            {
                domain = _configuration["Frontend:Url"] ?? $"{Request.Scheme}://{Request.Host}";
            }
            domain = domain.TrimEnd('/');

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
        public async Task<IActionResult> Webhook([FromBody] System.Text.Json.JsonElement json)
        {
            try
            {
                var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var webhookBody = System.Text.Json.JsonSerializer.Deserialize<global::PayOS.Models.Webhooks.Webhook>(json.GetRawText(), options);
                
                if (webhookBody == null)
                {
                    return BadRequest(new { success = false, message = "Failed to deserialize PayOS webhook body." });
                }

                var success = await _paymentService.VerifyPaymentWebhookAsync(webhookBody);
                
                if (success)
                {
                    return Ok(new { success = true });
                }
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[PAYOS_WEBHOOK_ERROR]: {ex.Message}");
                return BadRequest(new { success = false, message = ex.Message });
            }

            return BadRequest(new { success = false });
        }
    }
}

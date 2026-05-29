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
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(IPaymentService paymentService, IConfiguration configuration, ILogger<PaymentController> logger)
        {
            _paymentService = paymentService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("create")]
        [Authorize(Roles = "Employer,Admin")] // Typically employers top up wallet
        public async Task<IActionResult> CreatePaymentLink([FromBody] PaymentCreateRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // 1. Thử lấy domain từ header Referer của request (chứa URL trang frontend hiện tại)
            var domain = "";
            var referer = Request.Headers["Referer"].ToString();
            if (!string.IsNullOrEmpty(referer))
            {
                try
                {
                    var uri = new Uri(referer);
                    domain = $"{uri.Scheme}://{uri.Authority}";
                }
                catch {}
            }

            // 2. Nếu Referer trống, thử lấy từ header Origin
            if (string.IsNullOrEmpty(domain))
            {
                domain = Request.Headers["Origin"].ToString();
            }

            // 3. Nếu vẫn trống, fallback về cấu hình config hoặc request host
            if (string.IsNullOrEmpty(domain) || domain.Contains("localhost:5250") || domain.Contains("unitask-backend"))
            {
                domain = _configuration["Frontend:Url"] ?? $"{Request.Scheme}://{Request.Host}";
            }
            domain = domain.TrimEnd('/');

            // Ghi log bằng ILogger chuẩn của Microsoft để chắc chắn hiển thị trên console logs của Docker
            _logger.LogInformation("[CREATE_PAYMENT] Referer: {Referer}, Origin: {Origin}, ConfigUrl: {ConfigUrl}, Final Domain: {Domain}", 
                referer, Request.Headers["Origin"].ToString(), _configuration["Frontend:Url"], domain);

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

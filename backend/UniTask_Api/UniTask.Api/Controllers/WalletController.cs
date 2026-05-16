using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniTask.Business.DTOs.Wallet;
using UniTask.Business.Interfaces;

namespace UniTask.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpGet]
        public async Task<IActionResult> GetWallet()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var wallet = await _walletService.GetWalletAsync(userId);
            if (wallet == null) return NotFound("Wallet not found.");

            return Ok(wallet);
        }

        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit([FromBody] AmountDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var success = await _walletService.DepositAsync(userId, dto.Amount);
            if (!success) return BadRequest("Deposit failed.");

            return Ok(new { message = "Deposit successful" });
        }

        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw([FromBody] WithdrawRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var success = await _walletService.WithdrawAsync(userId, dto);
            if (!success) return BadRequest(new { message = "Withdrawal failed. Insufficient balance." });

            return Ok(new { message = "Withdrawal successful" });
        }
    }
}

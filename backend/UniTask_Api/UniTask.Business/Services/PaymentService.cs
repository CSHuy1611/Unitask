using Microsoft.Extensions.Configuration;
using UniTask.Business.DTOs.Payment;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using UniTask.Business.Hubs;

namespace UniTask.Business.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly global::PayOS.PayOSClient _payOS;
        private readonly IHubContext<DashboardHub> _hubContext;

        public PaymentService(AppDbContext context, IConfiguration configuration, IHubContext<DashboardHub> hubContext)
        {
            _context = context;
            _configuration = configuration;
            _hubContext = hubContext;

            var clientId = _configuration["PayOS:ClientId"];
            var apiKey = _configuration["PayOS:ApiKey"];
            var checksumKey = _configuration["PayOS:ChecksumKey"];
            
            var options = new global::PayOS.PayOSOptions
            {
                ClientId = clientId!,
                ApiKey = apiKey!,
                ChecksumKey = checksumKey!
            };
            
            _payOS = new global::PayOS.PayOSClient(options);
        }

        public async Task<PaymentLinkResponseDto> CreatePaymentLinkAsync(string userId, PaymentCreateRequestDto dto, string domain)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            long orderCode = long.Parse(DateTimeOffset.Now.ToString("yyMMddHHmmss"));

            var paymentData = new global::PayOS.Models.V2.PaymentRequests.CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = (int)dto.Amount,
                Description = $"Nap tien vao vi UniTask",
                CancelUrl = $"{domain}/wallet?status=cancel",
                ReturnUrl = $"{domain}/wallet?status=success"
            };

            var createPayment = await _payOS.PaymentRequests.CreateAsync(paymentData);

            // Log intention to DB
            _context.Transactions.Add(new Transaction
            {
                WalletId = (await _context.Wallets.FirstAsync(w => w.UserId == userId)).Id,
                Amount = dto.Amount,
                Type = TransactionType.Deposit,
                Description = $"[PAYOS_PENDING] Nạp tiền qua PayOS. Mã ĐH: {orderCode}",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return new PaymentLinkResponseDto
            {
                CheckoutUrl = createPayment.CheckoutUrl,
                OrderCode = orderCode
            };
        }

        public async Task<bool> VerifyPaymentWebhookAsync(global::PayOS.Models.Webhooks.Webhook webhookBody)
        {
            try
            {
                var data = await _payOS.Webhooks.VerifyAsync(webhookBody);
                if (data == null) return false;

                if (webhookBody.Code == "00")
                {
                    // Payment Success
                    var orderCode = data.OrderCode;
                    var amount = data.Amount;

                    // Find pending transaction
                    var pendingTx = await _context.Transactions
                        .Include(t => t.Wallet)
                        .FirstOrDefaultAsync(t => t.Description != null && t.Description.Contains("[PAYOS_PENDING]") && t.Description.Contains(orderCode.ToString()));

                    if (pendingTx != null)
                    {
                        // Update wallet
                        pendingTx.Wallet.Balance += amount;

                        // Mark transaction as success
                        pendingTx.Description = $"Nạp tiền qua PayOS thành công. Mã ĐH: {orderCode}";
                        pendingTx.CreatedAt = DateTime.UtcNow; // update time

                        await _context.SaveChangesAsync();

                        // Notify admin
                        await _hubContext.Clients.All.SendAsync("TransactionOccurred");

                        return true;
                    }
                }

                return false;
            }
            catch
            {
                return false;
            }
        }
    }
}

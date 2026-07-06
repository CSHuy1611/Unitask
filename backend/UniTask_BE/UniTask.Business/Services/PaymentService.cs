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
        private static readonly Dictionary<string, string> BankBins = new Dictionary<string, string>
        {
            { "970415", "VietinBank" },
            { "970436", "Vietcombank" },
            { "970418", "BIDV" },
            { "970405", "Agribank" },
            { "970448", "OCB" },
            { "970422", "MBBank" },
            { "970407", "Techcombank" },
            { "970416", "ACB" },
            { "970432", "VPBank" },
            { "970423", "TPBank" },
            { "970403", "Sacombank" },
            { "970437", "HDBank" },
            { "970454", "VietCapitalBank" },
            { "970429", "SCB" },
            { "970441", "VIB" },
            { "970443", "SHB" },
            { "970431", "Eximbank" },
            { "970426", "MSB" },
            { "546034", "CAKE" },
            { "546035", "Ubank" },
            { "971005", "ViettelMoney" },
            { "963388", "Timo" },
            { "971011", "VNPTMoney" },
            { "970400", "SaigonBank" },
            { "970409", "BacABank" },
            { "971025", "MoMo" },
            { "971133", "PVcomBank Pay" },
            { "970412", "PVcomBank" },
            { "970414", "MBV" },
            { "970419", "NCB" },
            { "970424", "ShinhanBank" },
            { "970425", "ABBANK" },
            { "970427", "VietABank" },
            { "970428", "NamABank" },
            { "970430", "PGBank" },
            { "970433", "VietBank" },
            { "970438", "BaoVietBank" },
            { "970440", "SeABank" },
            { "970446", "COOPBANK" },
            { "970449", "LPBank" },
            { "970452", "KienLongBank" },
            { "668888", "KBank" },
            { "977777", "MAFC" },
            { "970442", "HongLeong" },
            { "970467", "KEBHANAHN" },
            { "970466", "KEBHanaHCM" },
            { "533948", "Citibank" },
            { "970444", "CBBank" },
            { "422589", "CIMB" },
            { "796500", "DBSBank" },
            { "970406", "Vikki" },
            { "999888", "VBSP" },
            { "970408", "GPBank" },
            { "970463", "KookminHCM" },
            { "970462", "KookminHN" },
            { "970457", "Woori" },
            { "970421", "VRB" },
            { "458761", "HSBC" },
            { "970455", "IBKHN" },
            { "970456", "IBKHCM" },
            { "970434", "IndovinaBank" },
            { "970458", "UnitedOverseas" },
            { "801011", "Nonghyup" },
            { "970410", "StandardChartered" },
            { "970439", "PublicBank" },
        };
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
                Description = "UT demo du an hoc tap",
                CancelUrl = $"{domain}/payment/cancel",
                ReturnUrl = $"{domain}/payment/success"
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
                System.Console.WriteLine($"[PAYOS_WEBHOOK] Received Webhook call with Code: {webhookBody.Code}");
                
                var data = await _payOS.Webhooks.VerifyAsync(webhookBody);
                if (data == null)
                {
                    System.Console.WriteLine("[PAYOS_WEBHOOK] Signature verification failed. VerifyAsync returned null.");
                    return false;
                }

                var orderCode = data.OrderCode;
                var amount = data.Amount;
                System.Console.WriteLine($"[PAYOS_WEBHOOK] Signature verified successfully. OrderCode: {orderCode}, Amount: {amount}");

                // Check if this is a test webhook from PayOS dashboard configuration
                if (orderCode == 123 || orderCode == 0)
                {
                    System.Console.WriteLine("[PAYOS_WEBHOOK] Ignored test webhook from PayOS configuration successfully.");
                    return true;
                }

                if (webhookBody.Code == "00")
                {
                    // 1. Check if transaction has already been completed (idempotency check)
                    var completedTx = await _context.Transactions
                        .AnyAsync(t => t.Description != null && t.Description.Contains("thành công") && t.Description.Contains(orderCode.ToString()));
                    
                    if (completedTx)
                    {
                        System.Console.WriteLine($"[PAYOS_WEBHOOK] Transaction for OrderCode {orderCode} was already successfully processed. Skipping.");
                        return true; // Return true to response with 200 OK to stop retries
                    }

                    // 2. Find pending transaction
                    var pendingTx = await _context.Transactions
                        .Include(t => t.Wallet)
                        .FirstOrDefaultAsync(t => t.Description != null && t.Description.Contains("[PAYOS_PENDING]") && t.Description.Contains(orderCode.ToString()));

                    if (pendingTx != null)
                    {
                        var roundedAmount = Math.Round((decimal)amount, 0);
                        // Update wallet
                        pendingTx.Wallet.Balance += roundedAmount;

                        // Save metadata from PayOS webhook
                        var bankId = data.CounterAccountBankId;
                        var resolvedBankName = bankId;
                        if (!string.IsNullOrEmpty(bankId) && BankBins.TryGetValue(bankId, out var shortName))
                        {
                            resolvedBankName = $"{shortName} ({bankId})";
                        }

                        pendingTx.CounterAccountBankName = !string.IsNullOrEmpty(data.CounterAccountBankName) 
                            ? data.CounterAccountBankName 
                            : resolvedBankName;
                        pendingTx.CounterAccountName = data.CounterAccountName;
                        pendingTx.CounterAccountNumber = data.CounterAccountNumber;

                        // Mark transaction as success
                        pendingTx.Description = $"Nạp tiền qua PayOS thành công (demo dự án học tập). Mã ĐH: {orderCode}";
                        pendingTx.CreatedAt = DateTime.UtcNow; // update time

                        await _context.SaveChangesAsync();
                        System.Console.WriteLine($"[PAYOS_WEBHOOK] Successfully completed transaction for OrderCode {orderCode}, added {roundedAmount} to wallet.");

                        // Notify admin
                        await _hubContext.Clients.All.SendAsync("TransactionOccurred");

                        return true;
                    }
                    else
                    {
                        System.Console.WriteLine($"[PAYOS_WEBHOOK] Error: Pending transaction not found for OrderCode {orderCode}");
                        return false;
                    }
                }

                System.Console.WriteLine($"[PAYOS_WEBHOOK] Webhook code is not success: {webhookBody.Code}");
                return false;
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[PAYOS_WEBHOOK_EXCEPTION] Error during verify: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> VerifyPaymentLocalAsync(long orderCode)
        {
            try
            {
                var clientId = _configuration["PayOS:ClientId"];
                var apiKey = _configuration["PayOS:ApiKey"];
                
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("x-client-id", clientId);
                client.DefaultRequestHeaders.Add("x-api-key", apiKey);
                
                var response = await client.GetAsync($"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}");
                if (!response.IsSuccessStatusCode) return false;
                
                var content = await response.Content.ReadAsStringAsync();
                var json = System.Text.Json.JsonDocument.Parse(content);
                
                if (json.RootElement.TryGetProperty("data", out var data))
                {
                    var status = data.GetProperty("status").GetString();
                    var amount = data.GetProperty("amount").GetDecimal();

                    if (status == "PAID" || status == "Success")
                    {
                    var completedTx = await _context.Transactions
                        .AnyAsync(t => t.Description != null && t.Description.Contains("thành công") && t.Description.Contains(orderCode.ToString()));
                    
                    if (completedTx) return true;

                    var pendingTx = await _context.Transactions
                        .Include(t => t.Wallet)
                        .FirstOrDefaultAsync(t => t.Description != null && t.Description.Contains("[PAYOS_PENDING]") && t.Description.Contains(orderCode.ToString()));

                    if (pendingTx != null)
                    {
                        var roundedAmount = Math.Round(amount, 0);
                        pendingTx.Wallet.Balance += roundedAmount;
                        pendingTx.Description = $"Nạp tiền qua PayOS thành công (demo dự án học tập). Mã ĐH: {orderCode}";
                        pendingTx.CreatedAt = DateTime.UtcNow;

                        await _context.SaveChangesAsync();
                        await _hubContext.Clients.All.SendAsync("TransactionOccurred");
                        return true;
                    }
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[VerifyPaymentLocalAsync] Error: {ex.Message}");
                return false;
            }
        }

        public async Task<int> SyncPendingTransactionsAsync(string userId)
        {
            try
            {
                var pendingTxs = await _context.Transactions
                    .Include(t => t.Wallet)
                    .Where(t => t.Wallet.UserId == userId && t.Description != null && t.Description.Contains("[PAYOS_PENDING]"))
                    .ToListAsync();

                int syncedCount = 0;
                foreach (var tx in pendingTxs)
                {
                    var match = System.Text.RegularExpressions.Regex.Match(tx.Description!, @"Mã ĐH: (\d+)");
                    if (match.Success && long.TryParse(match.Groups[1].Value, out long orderCode))
                    {
                        var success = await VerifyPaymentLocalAsync(orderCode);
                        if (success) syncedCount++;
                    }
                }
                return syncedCount;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[SyncPendingTransactionsAsync] Error: {ex.Message}");
                return 0;
            }
        }
    }
}

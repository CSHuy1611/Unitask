using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class WithdrawalBatchWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<WithdrawalBatchWorker> _logger;
        private DateTime _lastRunDate = DateTime.MinValue;

        public WithdrawalBatchWorker(IServiceScopeFactory scopeFactory, ILogger<WithdrawalBatchWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WithdrawalBatchWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = DateTime.UtcNow.AddHours(7); // Vietnam Time (UTC +7)
                    int lastDay = DateTime.DaysInMonth(now.Year, now.Month);

                    // Check if it's the last day of the month at 17:00 (5 PM)
                    if (now.Day == lastDay && now.Hour == 17 && _lastRunDate.Date != now.Date)
                    {
                        _logger.LogInformation("Scheduled end-of-month withdrawal batch process starting...");
                        await ProcessBatchAsync();
                        _lastRunDate = now;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in WithdrawalBatchWorker execution.");
                }

                // Check every 10 minutes
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }

        public async Task ProcessBatchAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<UniTask.Business.Interfaces.IEmailService>();

            var pendingWithdrawals = await context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .Where(t => t.Type == TransactionType.Withdrawal && t.Description != null && t.Description.StartsWith("[Pending]"))
                .ToListAsync();

            if (pendingWithdrawals.Any())
            {
                foreach (var tx in pendingWithdrawals)
                {
                    string cleanDesc = tx.Description!.Substring("[Pending]".Length).Trim();
                    tx.Description = "[Processing] " + cleanDesc;

                    if (tx.Wallet?.User?.Email != null)
                    {
                        var userSubject = "[UniTask] Yêu cầu rút tiền đang được chuyển khoản";
                        var userBody = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #d97706; margin: 0;"">Đang Xử Lý Chuyển Khoản</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <p style=""color: #1f2937; margin-bottom: 15px;"">Chào {tx.Wallet.User.FullName},</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Yêu cầu rút <strong>{Math.Abs(tx.Amount).ToString("N0")} VND</strong> của bạn đã được quản trị viên duyệt và đang trong quá trình chuyển tiền đến ngân hàng.</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Giao dịch của bạn đã chuyển sang trạng thái <strong>[Đang xử lý]</strong>. Tiền sẽ về tài khoản của bạn trong vòng tối đa 24 giờ tới.</p>
        <p style=""color: #1f2937;"">Vui lòng kiên nhẫn kiểm tra tài khoản ngân hàng. Cảm ơn bạn!</p>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                        try
                        {
                            await emailService.SendEmailAsync(tx.Wallet.User.Email, userSubject, userBody);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to send processing email to {tx.Wallet.User.Email}");
                        }
                    }
                }

                await context.SaveChangesAsync();
                _logger.LogInformation($"Successfully batched {pendingWithdrawals.Count} withdrawal requests into 'Processing' status.");
            }
        }
    }
}

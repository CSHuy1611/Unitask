using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using UniTask.Business.DTOs.Wallet;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

using Microsoft.AspNetCore.SignalR;
using UniTask.Business.Hubs;

namespace UniTask.Business.Services
{
    public class WalletService : IWalletService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<DashboardHub> _hubContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public WalletService(
            AppDbContext context, 
            IHubContext<DashboardHub> hubContext,
            UserManager<ApplicationUser> userManager,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _context = context;
            _hubContext = hubContext;
            _userManager = userManager;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<WalletDto?> GetWalletAsync(string userId)
        {
            var wallet = await _context.Wallets
                .Include(w => w.Transactions)
                    .ThenInclude(t => t.RelatedJob)
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null) return null;

            return new WalletDto
            {
                Balance = wallet.Balance,
                RecentTransactions = wallet.Transactions
                    .OrderByDescending(t => t.CreatedAt)
                    .Take(50)
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        Amount = t.Amount,
                        Type = t.Type,
                        TypeName = t.Type.ToString(),
                        Description = t.Description,
                        CreatedAt = t.CreatedAt,
                        RelatedJobId = t.RelatedJobId,
                        RelatedJobTitle = t.RelatedJob?.Title
                    }).ToList()
            };
        }



        public async Task<bool> WithdrawAsync(string userId, WithdrawRequestDto dto)
        {
            var roundedAmount = Math.Round(dto.Amount, 0);
            var wallet = await _context.Wallets.Include(w => w.User).FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null || wallet.Balance < roundedAmount) return false;

            wallet.Balance -= roundedAmount;

            var transaction = new Transaction
            {
                WalletId = wallet.Id,
                Amount = -roundedAmount, // Negative for withdrawal
                Type = TransactionType.Withdrawal,
                Description = $"[Pending] Rút tiền về NH {dto.Bank} - STK: {dto.AccountNumber} ({dto.AccountName})",
                CreatedAt = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            
            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            try
            {
                var admins = await _userManager.Users
                    .Where(u => u.UserType == UserType.Admin)
                    .ToListAsync();

                var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:4200";
                var approveLink = $"{frontendUrl.TrimEnd('/')}/admin/withdrawals";

                foreach (var admin in admins)
                {
                    if (string.IsNullOrEmpty(admin.Email)) continue;

                    var subject = $"[UniTask] Yêu cầu rút tiền mới từ {wallet.User.FullName}";
                    var body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #dc2626; margin: 0;"">Yêu Cầu Rút Tiền Mới</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <h4 style=""margin: 0 0 10px 0; color: #1f2937;"">Chi tiết giao dịch:</h4>
        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold; width: 150px;"">Người yêu cầu:</td>
                <td style=""padding: 5px 0; color: #111827;"">{wallet.User.FullName} ({wallet.User.Email})</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Số tiền rút:</td>
                <td style=""padding: 5px 0; color: #dc2626; font-weight: bold; font-size: 16px;"">{dto.Amount.ToString("N0")} VND</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Ngân hàng:</td>
                <td style=""padding: 5px 0; color: #111827;"">{dto.Bank}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Số tài khoản:</td>
                <td style=""padding: 5px 0; color: #111827;"">{dto.AccountNumber}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Tên tài khoản:</td>
                <td style=""padding: 5px 0; color: #111827; text-transform: uppercase;"">{dto.AccountName}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Thời gian:</td>
                <td style=""padding: 5px 0; color: #111827;"">{DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss")}</td>
            </tr>
        </table>
    </div>
    <div style=""text-align: center; margin-top: 25px;"">
        <a href=""{approveLink}"" style=""background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;"">Đến Trang Quản Lý Rút Tiền</a>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                    await _emailService.SendEmailAsync(admin.Email, subject, body);
                }

                // Send email to the User acknowledging their withdrawal request
                if (!string.IsNullOrEmpty(wallet.User.Email))
                {
                    var userSubject = "[UniTask] Yêu cầu rút tiền của bạn đang được xử lý";
                    var userBody = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #059669; margin: 0;"">Yêu Cầu Đã Được Tiếp Nhận</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <p style=""color: #1f2937; margin-bottom: 15px;"">Chào {wallet.User.FullName},</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Hệ thống đã ghi nhận yêu cầu rút <strong>{dto.Amount.ToString("N0")} VND</strong> về tài khoản <strong>{dto.Bank} - {dto.AccountNumber}</strong> của bạn.</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Yêu cầu của bạn đang ở trạng thái <strong>[Chờ xử lý]</strong> và sẽ được Admin tiến hành duyệt và chuyển khoản trong đợt thanh toán tiếp theo.</p>
        <p style=""color: #1f2937;"">Cảm ơn bạn đã tin tưởng và sử dụng UniTask!</p>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                    await _emailService.SendEmailAsync(wallet.User.Email, userSubject, userBody);
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[Email Notification Error] {ex.Message}");
            }
            
            return true;
        }
    }
}

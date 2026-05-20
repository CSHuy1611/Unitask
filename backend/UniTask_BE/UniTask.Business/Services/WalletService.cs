using Microsoft.EntityFrameworkCore;
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

        public WalletService(AppDbContext context, IHubContext<DashboardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
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

        public async Task<bool> DepositAsync(string userId, decimal amount)
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null) return false;

            wallet.Balance += amount;

            var transaction = new Transaction
            {
                WalletId = wallet.Id,
                Amount = amount,
                Type = TransactionType.Deposit,
                Description = "Nạp tiền vào tài khoản",
                CreatedAt = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            
            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");
            
            return true;
        }

        public async Task<bool> WithdrawAsync(string userId, WithdrawRequestDto dto)
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null || wallet.Balance < dto.Amount) return false;

            wallet.Balance -= dto.Amount;

            var transaction = new Transaction
            {
                WalletId = wallet.Id,
                Amount = -dto.Amount, // Negative for withdrawal
                Type = TransactionType.Withdrawal,
                Description = $"Rút tiền về NH {dto.Bank} - STK: {dto.AccountNumber} ({dto.AccountName})",
                CreatedAt = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            
            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");
            
            return true;
        }
    }
}

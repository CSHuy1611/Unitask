using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Subscription;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly AppDbContext _context;

        public SubscriptionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ServicePackageDto>> GetPackagesAsync()
        {
            return await _context.ServicePackages
                .Where(p => p.IsActive)
                .Select(p => new ServicePackageDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    DurationMonths = p.DurationMonths,
                    Description = p.Description
                })
                .ToListAsync();
        }

        public async Task<bool> SubscribeAsync(string employerId, int packageId)
        {
            // Transaction to ensure atomicity
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var package = await _context.ServicePackages.FindAsync(packageId);
                if (package == null || !package.IsActive) return false;

                var employerProfile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == employerId);
                if (employerProfile == null) return false;

                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
                var roundedPrice = Math.Round(package.Price, 0);
                if (wallet == null || wallet.Balance < roundedPrice)
                {
                    throw new Exception("Số dư không đủ để mua gói dịch vụ này.");
                }

                // Deduct balance
                wallet.Balance -= roundedPrice;

                // Log transaction
                _context.Transactions.Add(new Transaction
                {
                    WalletId = wallet.Id,
                    Amount = -roundedPrice,
                    Type = TransactionType.SubscriptionFee,
                    Description = $"Thanh toán gói dịch vụ: {package.Name}",
                    CreatedAt = DateTime.UtcNow
                });

                // Update or create subscription
                var existingSub = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.UserId == employerId && s.IsActive && s.EndDate > DateTime.UtcNow);

                DateTime newEndDate;
                if (existingSub != null)
                {
                    // Extend duration based on old subscription EndDate
                    newEndDate = existingSub.EndDate.AddMonths(package.DurationMonths);
                    existingSub.IsActive = false; // Mark old subscription as inactive so the new one takes over
                }
                else
                {
                    newEndDate = DateTime.UtcNow.AddMonths(package.DurationMonths);
                }

                _context.Subscriptions.Add(new Subscription
                {
                    UserId = employerId,
                    PackageId = packageId,
                    StartDate = DateTime.UtcNow,
                    EndDate = newEndDate,
                    IsActive = true
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}

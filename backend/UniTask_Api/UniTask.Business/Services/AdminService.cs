using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Admin;
using UniTask.Business.DTOs.Subscription;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class AdminService : IAdminService
    {
        private readonly AppDbContext _context;

        public AdminService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);

            return new DashboardStatsDto
            {
                TotalUsers = await _context.Users.CountAsync(),
                TotalStudents = await _context.StudentProfiles.CountAsync(),
                TotalEmployers = await _context.EmployerProfiles.CountAsync(),
                TotalJobs = await _context.Jobs.CountAsync(),
                TotalRevenue = await _context.Transactions
                    .Where(t => t.Type == TransactionType.CommissionFee || t.Type == TransactionType.PostingFee || t.Type == TransactionType.SubscriptionFee)
                    .SumAsync(t => t.Amount),
                EkycPending = await _context.Users.CountAsync(u => u.EkycStatus == EkycStatus.Pending),
                EkycVerified = await _context.Users.CountAsync(u => u.EkycStatus == EkycStatus.Verified),
                ApplicationsThisMonth = await _context.Applications
                    .CountAsync(a => a.AppliedDate >= startOfMonth)
            };
        }

        public async Task<ServicePackageDto> CreatePackageAsync(ServicePackageCreateDto dto)
        {
            var package = new ServicePackage
            {
                Name = dto.Name,
                Price = dto.Price,
                DurationMonths = dto.DurationMonths,
                Description = dto.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.ServicePackages.Add(package);
            await _context.SaveChangesAsync();

            return new ServicePackageDto
            {
                Id = package.Id,
                Name = package.Name,
                Price = package.Price,
                DurationMonths = package.DurationMonths,
                Description = package.Description
            };
        }

        public async Task<bool> UpdatePackageAsync(int id, ServicePackageUpdateDto dto)
        {
            var package = await _context.ServicePackages.FindAsync(id);
            if (package == null) return false;

            package.Name = dto.Name;
            package.Price = dto.Price;
            package.DurationMonths = dto.DurationMonths;
            package.Description = dto.Description;
            package.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeletePackageAsync(int id)
        {
            var package = await _context.ServicePackages.FindAsync(id);
            if (package == null) return false;

            // Soft delete by deactivating
            package.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

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

        public async Task<object> GetDashboardStatsAsync()
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);

            var summary = new
            {
                totalUsers = await _context.Users.CountAsync(),
                totalStudents = await _context.StudentProfiles.CountAsync(),
                totalEmployers = await _context.EmployerProfiles.CountAsync(),
                totalJobs = await _context.Jobs.CountAsync(),
                totalRevenue = await _context.Transactions
                    .Where(t => t.Type == TransactionType.CommissionFee || t.Type == TransactionType.PostingFee || t.Type == TransactionType.SubscriptionFee)
                    .SumAsync(t => -t.Amount),
                ekycPending = await _context.Users.CountAsync(u => u.EkycStatus == EkycStatus.Pending),
                ekycVerified = await _context.Users.CountAsync(u => u.EkycStatus == EkycStatus.Verified),
                applicationsThisMonth = await _context.Applications
                    .CountAsync(a => a.AppliedDate >= startOfMonth)
            };

            // Calculate live revenue for last 6 months
            var revenueByMonth = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var monthDate = now.AddMonths(-i);
                var monthStart = new DateTime(monthDate.Year, monthDate.Month, 1);
                var monthEnd = monthStart.AddMonths(1);

                var revenue = await _context.Transactions
                    .Where(t => (t.Type == TransactionType.CommissionFee || t.Type == TransactionType.PostingFee || t.Type == TransactionType.SubscriptionFee)
                                && t.CreatedAt >= monthStart && t.CreatedAt < monthEnd)
                    .SumAsync(t => -t.Amount);

                revenueByMonth.Add(new
                {
                    month = $"Tháng {monthDate.Month:D2}",
                    revenue = revenue
                });
            }

            // Calculate live subscribers per package
            var packages = await _context.ServicePackages
                .Where(p => p.IsActive)
                .Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    price = p.Price,
                    duration = $"{p.DurationMonths} tháng",
                    description = p.Description,
                    subscribers = _context.Subscriptions.Count(s => s.PackageId == p.Id && s.IsActive && s.EndDate > now)
                })
                .ToListAsync();

            return new
            {
                summary = summary,
                revenueByMonth = revenueByMonth,
                packages = packages
            };
        }

        public async Task<IEnumerable<object>> GetAllUsersAsync()
        {
            var users = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    fullName = u.FullName,
                    phone = u.PhoneNumber,
                    role = u.UserType == UserType.Student ? "student" : (u.UserType == UserType.Employer ? "employer" : "admin"),
                    ekycStatus = u.EkycStatus == EkycStatus.Pending ? "pending" : (u.EkycStatus == EkycStatus.Verified ? "verified" : (u.EkycStatus == EkycStatus.Rejected ? "rejected" : "none")),
                    ekycFrontImage = u.EkycFrontImageUrl,
                    ekycBackImage = u.EkycBackImageUrl,
                    university = u.StudentProfile != null ? u.StudentProfile.University : "",
                    companyName = u.EmployerProfile != null && u.EmployerProfile.Company != null ? u.EmployerProfile.Company.Name : "",
                    createdAt = u.CreatedAt.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            return users;
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

        public async Task<IEnumerable<object>> GetWithdrawalsAsync()
        {
            var withdrawals = await _context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .Where(t => t.Type == TransactionType.Withdrawal)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    id = t.Id,
                    amount = Math.Abs(t.Amount), // Số tiền yêu cầu rút dương
                    description = t.Description,
                    createdAt = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    userName = t.Wallet.User.FullName,
                    userEmail = t.Wallet.User.Email
                })
                .ToListAsync();

            return withdrawals;
        }

        public async Task<bool> CompleteWithdrawalAsync(int transactionId)
        {
            var transaction = await _context.Transactions.FindAsync(transactionId);
            if (transaction == null || transaction.Type != TransactionType.Withdrawal) return false;

            if (transaction.Description != null && transaction.Description.StartsWith("[Completed]"))
            {
                return true; // Đã xử lý rồi
            }

            string cleanDesc = transaction.Description ?? "";
            transaction.Description = "[Completed] " + cleanDesc;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<object>> GetDisputesAsync()
        {
            var disputes = await _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                .Include(j => j.SelectedStudent)
                .Where(j => j.Status == JobStatus.Disputed)
                .OrderByDescending(j => j.DisputedDate)
                .Select(j => new
                {
                    id = j.Id,
                    title = j.Title,
                    budget = j.Budget,
                    commission = j.Commission,
                    employerName = j.Employer.FullName,
                    employerEmail = j.Employer.Email,
                    studentName = j.SelectedStudent != null ? j.SelectedStudent.FullName : "",
                    studentEmail = j.SelectedStudent != null ? j.SelectedStudent.Email : "",
                    disputeReason = j.DisputeReason,
                    employerEvidenceText = j.EmployerEvidenceText,
                    employerEvidenceUrl = j.EmployerEvidenceUrl,
                    studentEvidenceText = j.StudentEvidenceText,
                    studentEvidenceUrl = j.StudentEvidenceUrl,
                    disputedDate = j.DisputedDate.HasValue ? j.DisputedDate.Value.ToString("yyyy-MM-dd HH:mm:ss") : ""
                })
                .ToListAsync();

            return disputes;
        }

        public async Task<bool> ResolveDisputeAsync(int jobId, DisputeResolveDto dto)
        {
            var job = await _context.Jobs
                .Include(j => j.Employer)
                .Include(j => j.SelectedStudent)
                .FirstOrDefaultAsync(j => j.Id == jobId && j.Status == JobStatus.Disputed);

            if (job == null) return false;

            if (dto.Winner == "Student")
            {
                // Student wins: Escrow goes to Student, Employer is blacklisted
                job.Status = JobStatus.Completed;

                if (job.SelectedStudentId != null)
                {
                    var studentWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == job.SelectedStudentId);
                    if (studentWallet != null)
                    {
                        studentWallet.Balance += job.Budget;

                        _context.Transactions.Add(new Transaction
                        {
                            WalletId = studentWallet.Id,
                            Amount = job.Budget,
                            Type = TransactionType.EscrowRelease,
                            Description = $"Nhận tiền công giải quyết tranh chấp công việc: {job.Title}",
                            RelatedJobId = job.Id,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                // Increment Employer's Blacklist Count
                job.Employer.BlacklistCount++;
            }
            else if (dto.Winner == "Employer")
            {
                // Employer wins: Escrow goes back to Employer (Commission kept by platform), Student is blacklisted
                job.Status = JobStatus.Closed;

                var employerWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == job.EmployerId);
                if (employerWallet != null)
                {
                    employerWallet.Balance += job.Budget;

                    _context.Transactions.Add(new Transaction
                    {
                        WalletId = employerWallet.Id,
                        Amount = job.Budget,
                        Type = TransactionType.Refund,
                        Description = $"Hoàn tiền công giải quyết tranh chấp công việc: {job.Title}",
                        RelatedJobId = job.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Increment Student's Blacklist Count
                if (job.SelectedStudent != null)
                {
                    job.SelectedStudent.BlacklistCount++;
                }
            }
            else
            {
                return false;
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}

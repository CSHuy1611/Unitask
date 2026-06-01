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
                totalDeposits = await _context.Transactions
                    .Where(t => t.Type == TransactionType.Deposit && !(t.Description != null && t.Description.Contains("[PAYOS_PENDING]")))
                    .SumAsync(t => t.Amount),
                commissionRevenue = await _context.Transactions
                    .Where(t => t.Type == TransactionType.CommissionFee)
                    .SumAsync(t => -t.Amount),
                postingFeeRevenue = await _context.Transactions
                    .Where(t => t.Type == TransactionType.PostingFee)
                    .SumAsync(t => -t.Amount),
                subscriptionRevenue = await _context.Transactions
                    .Where(t => t.Type == TransactionType.SubscriptionFee)
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
                    durationMonths = p.DurationMonths,
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

        public async Task<object> GetAllUsersAsync(int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _context.Users
                .Include(u => u.StudentProfile)
                .Include(u => u.EmployerProfile)
                    .ThenInclude(ep => ep != null ? ep.Company : null)
                .AsQueryable();

            var totalCount = await query.CountAsync();

            // Load raw entities first, then do sorting + projection in memory
            // EF Core cannot translate nested ternaries, .ToString(format), or complex navigation checks to SQL
            var rawUsers = await query.ToListAsync();

            var items = rawUsers
                .OrderByDescending(u => u.EkycStatus == EkycStatus.Pending)
                .ThenByDescending(u => u.EkycStatus == EkycStatus.None)
                .ThenByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    fullName = u.FullName,
                    phone = u.PhoneNumber ?? "",
                    avatar = (u.FullName ?? "U").Substring(0, 1).ToUpper(),
                    role = u.UserType == UserType.Student ? "student" : (u.UserType == UserType.Employer ? "employer" : "admin"),
                    ekycStatus = u.EkycStatus == EkycStatus.Pending ? "pending" : (u.EkycStatus == EkycStatus.Verified ? "verified" : (u.EkycStatus == EkycStatus.Rejected ? "rejected" : "none")),
                    ekycFrontImage = u.EkycFrontImageUrl ?? "",
                    ekycBackImage = u.EkycBackImageUrl ?? "",
                    university = u.StudentProfile?.University ?? "",
                    companyName = u.EmployerProfile?.Company?.Name ?? "",
                    createdAt = u.CreatedAt.ToString("yyyy-MM-dd")
                })
                .ToList();

            return new
            {
                items = items,
                totalCount = totalCount,
                hasMore = page * pageSize < totalCount
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

        public async Task<object> GetWithdrawalsAsync(int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var rawWithdrawals = await _context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .Where(t => t.Type == TransactionType.Withdrawal)
                .OrderBy(t => t.Description != null && t.Description.StartsWith("[Completed]"))
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();

            var totalCount = rawWithdrawals.Count;

            // Calculate overall stats on loaded data
            var totalPendingAmount = rawWithdrawals
                .Where(w => !(w.Description != null && w.Description.StartsWith("[Completed]")))
                .Sum(w => Math.Abs(w.Amount));

            var pendingCount = rawWithdrawals
                .Count(w => !(w.Description != null && w.Description.StartsWith("[Completed]")));

            var totalCompletedAmount = rawWithdrawals
                .Where(w => w.Description != null && w.Description.StartsWith("[Completed]"))
                .Sum(w => Math.Abs(w.Amount));

            var completedCount = rawWithdrawals
                .Count(w => w.Description != null && w.Description.StartsWith("[Completed]"));

            var totalWithdrawalAmount = rawWithdrawals
                .Sum(w => Math.Abs(w.Amount));

            var items = rawWithdrawals
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    id = t.Id,
                    amount = Math.Abs(t.Amount),
                    description = t.Description ?? "",
                    createdAt = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    userName = t.Wallet?.User?.FullName ?? "Sinh viên",
                    userEmail = t.Wallet?.User?.Email ?? ""
                })
                .ToList();

            return new
            {
                items = items,
                totalCount = totalCount,
                hasMore = page * pageSize < totalCount,
                totalPendingAmount = totalPendingAmount,
                pendingCount = pendingCount,
                totalCompletedAmount = totalCompletedAmount,
                completedCount = completedCount,
                totalWithdrawalAmount = totalWithdrawalAmount
            };
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

        public async Task<object> GetDisputesAsync(int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var rawDisputes = await _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                .Include(j => j.SelectedStudent)
                .Where(j => j.Status == JobStatus.Disputed)
                .OrderByDescending(j => j.DisputedDate)
                .ToListAsync();

            var totalCount = rawDisputes.Count;

            var items = rawDisputes
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(j => new
                {
                    id = j.Id,
                    title = j.Title ?? "",
                    budget = j.Budget,
                    commission = j.Commission,
                    employerName = j.Employer?.FullName ?? "",
                    employerEmail = j.Employer?.Email ?? "",
                    studentName = j.SelectedStudent?.FullName ?? "",
                    studentEmail = j.SelectedStudent?.Email ?? "",
                    disputeReason = j.DisputeReason ?? "",
                    employerEvidenceText = j.EmployerEvidenceText ?? "",
                    employerEvidenceUrl = j.EmployerEvidenceUrl ?? "",
                    studentEvidenceText = j.StudentEvidenceText ?? "",
                    studentEvidenceUrl = j.StudentEvidenceUrl ?? "",
                    disputedDate = j.DisputedDate.HasValue ? j.DisputedDate.Value.ToString("yyyy-MM-dd HH:mm:ss") : ""
                })
                .ToList();

            return new
            {
                items = items,
                totalCount = totalCount,
                hasMore = page * pageSize < totalCount
            };
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

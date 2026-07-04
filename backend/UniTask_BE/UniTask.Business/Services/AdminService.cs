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
        private readonly IEmailService _emailService;

        public AdminService(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
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
                    ekycFrontImage = "",
                    ekycBackImage = "",
                    university = u.StudentProfile?.University ?? "",
                    companyName = u.EmployerProfile?.Company?.Name ?? "",
                    createdAt = u.CreatedAt.ToString("yyyy-MM-dd"),
                    reliabilityScore = u.StudentProfile?.ReliabilityScore ?? 100,
                    isFlagged = u.IsFlagged,
                    flagReason = u.FlagReason ?? ""
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
                .ThenBy(t => t.Description != null && t.Description.StartsWith("[Processing]"))
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();

            var totalCount = rawWithdrawals.Count;

            // Calculate overall stats on loaded data
            var totalPendingAmount = rawWithdrawals
                .Where(w => w.Description == null || (!w.Description.StartsWith("[Completed]") && !w.Description.StartsWith("[Processing]")))
                .Sum(w => Math.Abs(w.Amount));

            var pendingCount = rawWithdrawals
                .Count(w => w.Description == null || (!w.Description.StartsWith("[Completed]") && !w.Description.StartsWith("[Processing]")));

            var totalProcessingAmount = rawWithdrawals
                .Where(w => w.Description != null && w.Description.StartsWith("[Processing]"))
                .Sum(w => Math.Abs(w.Amount));

            var processingCount = rawWithdrawals
                .Count(w => w.Description != null && w.Description.StartsWith("[Processing]"));

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
                .Select(t => {
                    var desc = t.Description ?? "";
                    string status = "pending";
                    string cleanDesc = desc;

                    if (desc.StartsWith("[Completed]")) {
                        status = "completed";
                        cleanDesc = desc.Substring("[Completed]".Length).Trim();
                    } else if (desc.StartsWith("[Processing]")) {
                        status = "processing";
                        cleanDesc = desc.Substring("[Processing]".Length).Trim();
                    } else if (desc.StartsWith("[Pending]")) {
                        status = "pending";
                        cleanDesc = desc.Substring("[Pending]".Length).Trim();
                    }

                    return new
                    {
                        id = t.Id,
                        amount = Math.Abs(t.Amount),
                        description = cleanDesc,
                        status = status,
                        createdAt = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                        userName = t.Wallet?.User?.FullName ?? "Sinh viên",
                        userEmail = t.Wallet?.User?.Email ?? ""
                    };
                })
                .ToList();

            return new
            {
                items = items,
                totalCount = totalCount,
                hasMore = page * pageSize < totalCount,
                totalPendingAmount = totalPendingAmount,
                pendingCount = pendingCount,
                totalProcessingAmount = totalProcessingAmount,
                processingCount = processingCount,
                totalCompletedAmount = totalCompletedAmount,
                completedCount = completedCount,
                totalWithdrawalAmount = totalWithdrawalAmount
            };
        }

        public async Task<bool> CompleteWithdrawalAsync(int transactionId)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null || transaction.Type != TransactionType.Withdrawal) return false;

            string desc = transaction.Description ?? "";
            if (desc.StartsWith("[Completed]"))
            {
                return true; // Already processed
            }

            string cleanDesc = desc;
            if (desc.StartsWith("[Processing]"))
            {
                cleanDesc = desc.Substring("[Processing]".Length).Trim();
            }
            else if (desc.StartsWith("[Pending]"))
            {
                cleanDesc = desc.Substring("[Pending]".Length).Trim();
            }

            transaction.Description = "[Completed] " + cleanDesc;

            await _context.SaveChangesAsync();

            // Send Email to User
            if (transaction.Wallet?.User?.Email != null)
            {
                var userSubject = "[UniTask] Rút tiền thành công";
                var userBody = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #059669; margin: 0;"">Rút Tiền Thành Công</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <p style=""color: #1f2937; margin-bottom: 15px;"">Chào {transaction.Wallet.User.FullName},</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Yêu cầu rút <strong>{Math.Abs(transaction.Amount).ToString("N0")} VND</strong> của bạn đã được chuyển khoản thành công!</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Số tiền này đã được gửi đến tài khoản ngân hàng của bạn. Vui lòng kiểm tra biến động số dư. Nếu có bất kỳ thắc mắc nào, hãy liên hệ với bộ phận hỗ trợ của UniTask.</p>
        <p style=""color: #1f2937;"">Cảm ơn bạn đã đồng hành cùng UniTask!</p>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                try
                {
                    await _emailService.SendEmailAsync(transaction.Wallet.User.Email, userSubject, userBody);
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[Email Error] {ex.Message}");
                }
            }

            return true;
        }

        public async Task<bool> BatchProcessWithdrawalsAsync()
        {
            var pendingWithdrawals = await _context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .Where(t => t.Type == TransactionType.Withdrawal && t.Description != null && (t.Description.StartsWith("[Pending]") || (!t.Description.StartsWith("[Processing]") && !t.Description.StartsWith("[Completed]"))))
                .ToListAsync();

            if (pendingWithdrawals.Any())
            {
                foreach (var tx in pendingWithdrawals)
                {
                    string desc = tx.Description ?? "";
                    string cleanDesc = desc;
                    if (desc.StartsWith("[Pending]"))
                    {
                        cleanDesc = desc.Substring("[Pending]".Length).Trim();
                    }
                    tx.Description = "[Processing] " + cleanDesc;

                    // Send email to user
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
                            await _emailService.SendEmailAsync(tx.Wallet.User.Email, userSubject, userBody);
                        }
                        catch (Exception ex)
                        {
                            System.Console.WriteLine($"[Email Error] {ex.Message}");
                        }
                    }
                }

                await _context.SaveChangesAsync();
            }
            return true;
        }

        public async Task<bool> RejectWithdrawalAsync(int transactionId, string reason)
        {
            var transaction = await _context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.Type == TransactionType.Withdrawal);

            if (transaction == null || transaction.Description == null) return false;
            
            // Only allow rejecting pending or processing withdrawals
            if (transaction.Description.StartsWith("[Completed]") || transaction.Description.StartsWith("[Rejected]"))
            {
                return false;
            }

            // Refund the money back to the user's wallet
            if (transaction.Wallet != null)
            {
                transaction.Wallet.Balance += Math.Abs(transaction.Amount);
            }

            string desc = transaction.Description;
            string cleanDesc = desc;
            if (desc.StartsWith("[Processing]"))
            {
                cleanDesc = desc.Substring("[Processing]".Length).Trim();
            }
            else if (desc.StartsWith("[Pending]"))
            {
                cleanDesc = desc.Substring("[Pending]".Length).Trim();
            }

            transaction.Description = $"[Rejected] {cleanDesc} - Lý do: {reason}";

            await _context.SaveChangesAsync();

            // Send Email to User
            if (transaction.Wallet?.User?.Email != null)
            {
                var userSubject = "[UniTask] Yêu cầu rút tiền bị từ chối";
                var userBody = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #dc2626; margin: 0;"">Rút Tiền Thất Bại</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <p style=""color: #1f2937; margin-bottom: 15px;"">Chào {transaction.Wallet.User.FullName},</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Yêu cầu rút <strong>{Math.Abs(transaction.Amount).ToString("N0")} VND</strong> của bạn đã bị từ chối.</p>
        <p style=""color: #1f2937; margin-bottom: 15px;""><strong>Lý do từ chối:</strong> {reason}</p>
        <p style=""color: #1f2937; margin-bottom: 15px;"">Số tiền trên đã được hoàn lại vào Ví UniTask của bạn. Vui lòng kiểm tra lại thông tin và thực hiện đặt lệnh rút tiền mới với thông tin chính xác hơn.</p>
        <p style=""color: #1f2937;"">Nếu bạn cần hỗ trợ, hãy liên hệ với bộ phận chăm sóc khách hàng của chúng tôi. Cảm ơn bạn!</p>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                try
                {
                    await _emailService.SendEmailAsync(transaction.Wallet.User.Email, userSubject, userBody);
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[Email Error] {ex.Message}");
                }
            }

            return true;
        }

        public async Task<object> GetDisputesAsync(int page = 1, int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var rawDisputes = await _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                .Include(j => j.Applications)
                    .ThenInclude(a => a.StudentProfile)
                        .ThenInclude(p => p.User)
                .Where(j => j.Status == JobStatus.Disputed)
                .OrderByDescending(j => j.DisputedDate)
                .ToListAsync();

            var totalCount = rawDisputes.Count;

            var items = rawDisputes
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(j => {
                    var firstAcceptedApp = j.Applications.FirstOrDefault(a => a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed);
                    var student = firstAcceptedApp?.StudentProfile?.User;
                    return new
                    {
                        id = j.Id,
                        title = j.Title ?? "",
                        budget = j.Budget,
                        commission = j.Commission,
                        employerName = j.Employer?.FullName ?? "",
                        employerEmail = j.Employer?.Email ?? "",
                        studentName = student?.FullName ?? "",
                        studentEmail = student?.Email ?? "",
                        disputeReason = j.DisputeReason ?? "",
                        employerEvidenceText = j.EmployerEvidenceText ?? "",
                        employerEvidenceUrl = j.EmployerEvidenceUrl ?? "",
                        studentEvidenceText = j.StudentEvidenceText ?? "",
                        studentEvidenceUrl = j.StudentEvidenceUrl ?? "",
                        disputedDate = j.DisputedDate.HasValue ? j.DisputedDate.Value.ToString("yyyy-MM-dd HH:mm:ss") : ""
                    };
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
                .Include(j => j.Applications)
                    .ThenInclude(a => a.StudentProfile)
                        .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(j => j.Id == jobId && j.Status == JobStatus.Disputed);

            if (job == null) return false;

            var acceptedApps = job.Applications.Where(a => a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed).ToList();

            if (dto.Winner == "Student")
            {
                // Student wins: Escrow goes to Student, Employer is blacklisted
                job.Status = JobStatus.Completed;

                foreach (var app in acceptedApps)
                {
                    var studentId = app.StudentProfile?.UserId;
                    if (studentId != null)
                    {
                        var studentWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
                        if (studentWallet != null)
                        {
                            var roundedBudget = Math.Round(job.Budget / acceptedApps.Count, 0);
                            studentWallet.Balance += roundedBudget;

                            _context.Transactions.Add(new Transaction
                            {
                                WalletId = studentWallet.Id,
                                Amount = roundedBudget,
                                Type = TransactionType.EscrowRelease,
                                Description = $"Nhận tiền công giải quyết tranh chấp công việc: {job.Title}",
                                RelatedJobId = job.Id,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
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
                    var roundedBudget = Math.Round(job.Budget, 0);
                    employerWallet.Balance += roundedBudget;

                    _context.Transactions.Add(new Transaction
                    {
                        WalletId = employerWallet.Id,
                        Amount = roundedBudget,
                        Type = TransactionType.Refund,
                        Description = $"Hoàn tiền công giải quyết tranh chấp công việc: {job.Title}",
                        RelatedJobId = job.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Increment Student's Blacklist Count
                foreach (var app in acceptedApps)
                {
                    if (app.StudentProfile?.User != null)
                    {
                        app.StudentProfile.User.BlacklistCount++;
                    }
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

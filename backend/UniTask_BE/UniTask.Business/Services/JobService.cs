using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Job;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;
using Microsoft.AspNetCore.SignalR;
using UniTask.Business.Hubs;

namespace UniTask.Business.Services
{
    public class JobService : IJobService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<DashboardHub> _hubContext;

        public JobService(AppDbContext context, IHubContext<DashboardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<IEnumerable<JobDto>> GetJobsAsync(JobFilterDto filter, string? currentUserId = null)
        {
            var query = _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                    .ThenInclude(u => u.EmployerProfile)
                .Include(j => j.Tags)
                .Include(j => j.Requirements)
                .Include(j => j.Benefits)
                .Include(j => j.Applications)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.StudentId))
            {
                var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == filter.StudentId);
                if (studentProfile != null)
                {
                    query = query.Where(j => j.RequiredReliabilityScore <= studentProfile.ReliabilityScore);
                }
            }

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                query = query.Where(j => j.Title.Contains(filter.SearchTerm) || 
                                         (j.Description != null && j.Description.Contains(filter.SearchTerm)) ||
                                         (j.Company != null && j.Company.Name.Contains(filter.SearchTerm)));
            }

            if (!string.IsNullOrEmpty(filter.Location))
            {
                query = query.Where(j => j.Location != null && j.Location.Contains(filter.Location));
            }

            if (!string.IsNullOrEmpty(filter.Type))
            {
                query = query.Where(j => j.Type == filter.Type);
            }

            if (filter.IsRemote.HasValue)
            {
                query = query.Where(j => j.IsRemote == filter.IsRemote.Value);
            }

            if (filter.IsUrgent.HasValue)
            {
                query = query.Where(j => j.IsUrgent == filter.IsUrgent.Value);
            }

            if (filter.Tags != null && filter.Tags.Any())
            {
                query = query.Where(j => j.Tags.Any(t => filter.Tags.Contains(t.TagName)));
            }

            // Fetch matching jobs first
            var allMatchingJobs = await query.ToListAsync();

            // Fetch active subscriptions to map package durations
            var activeSubscriptions = await _context.Subscriptions
                .Include(s => s.Package)
                .Where(s => s.IsActive && s.EndDate > DateTime.UtcNow && s.Package != null)
                .Select(s => new { s.UserId, s.Package.DurationMonths })
                .ToListAsync();

            var subscriptionMap = activeSubscriptions
                .GroupBy(s => s.UserId)
                .ToDictionary(g => g.Key, g => g.Max(s => s.DurationMonths));

            // Sort in-memory to prevent SQL Server memory grant errors (Error 8657) under constrained container memory limits
            // Prioritize Open jobs, then VIP package duration (12m > 6m > 3m > 0m), then PostedDate (newest post/shift first), then Urgent
            var sortedJobs = allMatchingJobs
                .Select(j => {
                    subscriptionMap.TryGetValue(j.EmployerId, out int duration);
                    return new { Job = j, Duration = duration };
                })
                .OrderByDescending(x => x.Job.Status == JobStatus.Open)
                .ThenByDescending(x => x.Duration)
                .ThenByDescending(x => x.Job.PostedDate)
                .ThenByDescending(x => x.Job.IsUrgent)
                .Select(x => x.Job)
                .ToList();

            // Pagination
            var skip = (filter.Page - 1) * filter.PageSize;
            var jobs = sortedJobs.Skip(skip).Take(filter.PageSize).ToList();

            // Get premium employers (duration >= 3 months)
            var premiumEmployers = subscriptionMap
                .Where(kvp => kvp.Value >= 3)
                .Select(kvp => kvp.Key)
                .ToList();

            var result = jobs.Select(j => MapToDto(j, premiumEmployers.Contains(j.EmployerId))).ToList();

            if (!string.IsNullOrEmpty(currentUserId))
            {
                var studentApplications = await _context.Applications
                    .Where(a => a.StudentProfile.UserId == currentUserId)
                    .Select(a => new { a.JobId, a.Status })
                    .ToListAsync();

                var appMap = studentApplications.ToDictionary(a => a.JobId, a => a.Status);

                foreach (var dto in result)
                {
                    dto.IsAppliedByCurrentUser = appMap.ContainsKey(dto.Id);
                    if (appMap.TryGetValue(dto.Id, out var status))
                    {
                        dto.CurrentUserApplicationStatus = status.ToString();
                    }
                }
            }

            return result;
        }

        public async Task<JobDto?> GetJobByIdAsync(int id, string? currentUserId = null)
        {
            var job = await _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                    .ThenInclude(u => u.EmployerProfile)
                .Include(j => j.Requirements)
                .Include(j => j.Benefits)
                .Include(j => j.Tags)
                .Include(j => j.Applications)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return null;

            // Increment views only if the requester is not the employer who posted the job
            if (string.IsNullOrEmpty(currentUserId) || job.EmployerId != currentUserId)
            {
                job.Views++;
                await _context.SaveChangesAsync();
            }

            var isPremium = await _context.Subscriptions.Include(s => s.Package).AnyAsync(s => s.UserId == job.EmployerId && s.IsActive && s.EndDate > DateTime.UtcNow && s.Package != null && s.Package.DurationMonths >= 3);

            var dto = MapToDto(job, isPremium);
            if (!string.IsNullOrEmpty(currentUserId))
            {
                var app = await _context.Applications
                    .FirstOrDefaultAsync(a => a.JobId == id && a.StudentProfile.UserId == currentUserId);
                if (app != null)
                {
                    dto.IsAppliedByCurrentUser = true;
                    dto.CurrentUserApplicationStatus = app.Status.ToString();
                }
            }
            return dto;
        }

        public async Task<JobDto?> CreateJobAsync(string employerId, JobCreateDto dto)
        {
            // Find company id for this employer
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == employerId);
            if (profile == null || profile.CompanyId == null) return null;

            var user = await _context.Users.FindAsync(employerId);

            // ===== Business License Gate =====
            // Employer phải upload giấy phép kinh doanh VÀ được Admin xác minh mới được đăng việc.
            if (profile.Type == UniTask.DataAcesss.Entities.Enums.EmployerType.Business)
            {
                if (string.IsNullOrEmpty(profile.BusinessLicenseUrl))
                {
                    throw new InvalidOperationException("Bạn chưa upload giấy phép kinh doanh. Vui lòng cập nhật hồ sơ và upload giấy phép trước khi đăng tin tuyển dụng.");
                }
                if (!profile.IsBusinessLicenseVerified)
                {
                    throw new InvalidOperationException("Giấy phép kinh doanh của bạn đang chờ Admin xác minh. Bạn chỉ có thể đăng tin sau khi giấy phép được phê duyệt.");
                }
            }
            else if (profile.Type == UniTask.DataAcesss.Entities.Enums.EmployerType.SmallBusinessHousehold)
            {
                if (user == null || user.EkycStatus != UniTask.DataAcesss.Entities.Enums.EkycStatus.Verified)
                {
                    throw new InvalidOperationException("Tài khoản của bạn chưa được xác thực eKYC. Hộ kinh doanh cần xác minh danh tính trước khi đăng việc.");
                }

                // Check active jobs count limit (<= 5)
                var activeJobsCount = await _context.Jobs.CountAsync(j => j.EmployerId == employerId && (j.Status == JobStatus.Open || j.Status == JobStatus.InProgress));
                if (activeJobsCount >= 5)
                {
                    throw new InvalidOperationException("Hộ kinh doanh chỉ được đăng tối đa 5 tin tuyển dụng đang hoạt động cùng lúc.");
                }

                // Check headcount limit (<= 10)
                if (dto.HeadCount > 10)
                {
                    throw new InvalidOperationException("Hộ kinh doanh chỉ được tuyển tối đa 10 người cho mỗi công việc.");
                }
                
                // Check job type (No Full-time)
                if (dto.Type.Contains("Full-time", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Hộ kinh doanh chỉ được phép đăng các công việc Part-time.");
                }
                
                // Check deadline (<= 30 days)
                if (dto.Deadline.HasValue && (dto.Deadline.Value - DateTime.UtcNow).TotalDays > 30)
                {
                    throw new InvalidOperationException("Hộ kinh doanh chỉ được phép đăng công việc có hạn chót (deadline) không quá 30 ngày.");
                }
            }

            // Check Blacklist Count
            if (user != null && user.BlacklistCount >= 3)
            {
                throw new InvalidOperationException("Tài khoản của bạn đã bị khóa đăng việc do vi phạm chính sách của hệ thống.");
            }

            // Check Wallet Balance & Active subscription for posting fee
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
            var hasActivePackage = await _context.Subscriptions
                .AnyAsync(s => s.UserId == employerId && s.IsActive && s.EndDate > DateTime.UtcNow);
            
            bool isFirstThreeHouseholdJobs = false;
            if (profile.Type == UniTask.DataAcesss.Entities.Enums.EmployerType.SmallBusinessHousehold)
            {
                int totalJobsCreated = await _context.Jobs.CountAsync(j => j.EmployerId == employerId);
                if (totalJobsCreated < 3)
                {
                    isFirstThreeHouseholdJobs = true;
                }
            }

            decimal postingFee = (hasActivePackage || isFirstThreeHouseholdJobs) ? 0 : 2000;
            
            // Round all currency values to whole numbers (VND integers) to prevent float discrepancies
            var roundedBudget = Math.Round(dto.Budget, 0, MidpointRounding.AwayFromZero);
            var roundedCommission = Math.Round(dto.Commission, 0, MidpointRounding.AwayFromZero);
            var roundedPostingFee = Math.Round(postingFee, 0, MidpointRounding.AwayFromZero);
            var totalCost = roundedBudget + roundedCommission + roundedPostingFee;
            
            if (wallet == null || wallet.Balance < totalCost)
            {
                throw new InvalidOperationException("Số dư ví không đủ để đăng công việc này. Vui lòng nạp thêm tiền.");
            }

            // Deduct from wallet
            wallet.Balance -= totalCost;

            var jobTags = dto.Tags.Select(t => new JobTag { TagName = t }).ToList();
            if (isFirstThreeHouseholdJobs)
            {
                jobTags.Add(new JobTag { TagName = "Miễn phí" });
            }

            var job = new Job
            {
                EmployerId = employerId,
                CompanyId = profile.CompanyId.Value,
                Title = dto.Title,
                Description = dto.Description,
                Location = dto.Location,
                Type = dto.Type,
                Category = dto.Category,
                SalaryText = dto.SalaryRange.Any() ? string.Join("-", dto.SalaryRange) : (dto.Salary ?? dto.SalaryText),
                Budget = roundedBudget,
                Commission = roundedCommission,
                PostedDate = DateTime.UtcNow,
                Deadline = dto.Deadline,
                IsUrgent = dto.IsUrgent,
                IsRemote = dto.IsRemote,
                RequiredReliabilityScore = dto.RequiredReliabilityScore,
                HeadCount = dto.HeadCount,
                WorkStartTime = dto.WorkStartTime,
                WorkEndTime = dto.WorkEndTime,
                WorkDate = dto.WorkDate,
                WorkDays = dto.WorkDays,
                Status = DataAcesss.Entities.Enums.JobStatus.Open,
                Tags = jobTags,
                Requirements = dto.Requirements.Select(r => new JobRequirement { Content = r }).ToList(),
                Benefits = dto.Benefits.Select(b => new JobBenefit { Content = b }).ToList()
            };

            _context.Jobs.Add(job);
            await _context.SaveChangesAsync(); // Save to get Job Id

            // Create Escrow and Commission Transactions
            _context.Transactions.Add(new Transaction
            {
                WalletId = wallet.Id,
                Amount = -roundedBudget,
                Type = DataAcesss.Entities.Enums.TransactionType.EscrowHold,
                Description = $"Tạm giữ tiền lương cho công việc: {job.Title}",
                RelatedJobId = job.Id,
                CreatedAt = DateTime.UtcNow
            });

            _context.Transactions.Add(new Transaction
            {
                WalletId = wallet.Id,
                Amount = -roundedCommission,
                Type = DataAcesss.Entities.Enums.TransactionType.CommissionFee,
                Description = $"Phí nền tảng (10%) cho công việc: {job.Title}",
                RelatedJobId = job.Id,
                CreatedAt = DateTime.UtcNow
            });

            if (roundedPostingFee > 0)
            {
                _context.Transactions.Add(new Transaction
                {
                    WalletId = wallet.Id,
                    Amount = -roundedPostingFee,
                    Type = DataAcesss.Entities.Enums.TransactionType.PostingFee,
                    Description = $"Phí đăng tin (không mua gói) cho công việc: {job.Title}",
                    RelatedJobId = job.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("JobCreated");

            var isPremium = await _context.Subscriptions.Include(s => s.Package).AnyAsync(s => s.UserId == employerId && s.IsActive && s.EndDate > DateTime.UtcNow && s.Package != null && s.Package.DurationMonths >= 3);
            return MapToDto(job, isPremium);
        }

        public async Task<bool> StartJobAsync(int jobId, string employerId)
        {
            var job = await _context.Jobs
                .Include(j => j.Applications)
                .FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
                
            if (job == null)
            {
                throw new InvalidOperationException("Không tìm thấy công việc hoặc bạn không có quyền thao tác.");
            }
            
            if (job.Status != UniTask.DataAcesss.Entities.Enums.JobStatus.Open)
            {
                throw new InvalidOperationException("Chỉ có thể bắt đầu công việc khi trạng thái đang mở (Open).");
            }
            
            var currentAcceptedCount = job.Applications.Count(a => 
                a.Status == UniTask.DataAcesss.Entities.Enums.ApplicationStatus.Accepted || 
                a.Status == UniTask.DataAcesss.Entities.Enums.ApplicationStatus.Completed || 
                a.Status == UniTask.DataAcesss.Entities.Enums.ApplicationStatus.Interviewing);
                
            if (currentAcceptedCount < job.HeadCount)
            {
                throw new InvalidOperationException($"Không thể bắt đầu công việc. Cần phê duyệt đủ {job.HeadCount} sinh viên (hiện có {currentAcceptedCount}).");
            }
            
            job.Status = UniTask.DataAcesss.Entities.Enums.JobStatus.InProgress;
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", jobId);
            return true;
        }

        public async Task<bool> UpdateJobAsync(int id, string employerId, JobUpdateDto dto)
        {
            var job = await _context.Jobs
                .Include(j => j.Tags)
                .Include(j => j.Requirements)
                .Include(j => j.Benefits)
                .FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId);

            if (job == null) return false;

            job.Title = dto.Title;
            job.Description = dto.Description;
            job.Location = dto.Location;
            job.Type = dto.Type;
            job.Category = dto.Category;
            job.SalaryText = dto.SalaryRange.Any() ? string.Join("-", dto.SalaryRange) : (dto.Salary ?? dto.SalaryText);
            
            job.WorkStartTime = dto.WorkStartTime;
            job.WorkEndTime = dto.WorkEndTime;
            job.WorkDate = dto.WorkDate;
            job.WorkDays = dto.WorkDays;
            job.Budget = dto.Budget;
            job.Commission = dto.Commission;
            job.Deadline = dto.Deadline;
            job.IsUrgent = dto.IsUrgent;
            job.IsRemote = dto.IsRemote;
            job.HeadCount = dto.HeadCount;

            // Update collections
            _context.JobTags.RemoveRange(job.Tags);
            _context.JobRequirements.RemoveRange(job.Requirements);
            _context.JobBenefits.RemoveRange(job.Benefits);

            job.Tags = dto.Tags.Select(t => new JobTag { TagName = t }).ToList();
            job.Requirements = dto.Requirements.Select(r => new JobRequirement { Content = r }).ToList();
            job.Benefits = dto.Benefits.Select(b => new JobBenefit { Content = b }).ToList();

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("JobCreated");
            return true;
        }

        public async Task<bool> DeleteJobAsync(int id, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId);
            if (job == null) return false;

            // Only allow deleting jobs that are still in "Open" status (no active students assigned)
            if (job.Status != DataAcesss.Entities.Enums.JobStatus.Open)
                return false;

            // Find Employer's Wallet
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
            if (wallet != null)
            {
                var roundedRefund = Math.Round(job.Budget, 0);
                wallet.Balance += roundedRefund;

                // Log Refund transaction
                _context.Transactions.Add(new Transaction
                {
                    WalletId = wallet.Id,
                    Amount = roundedRefund,
                    Type = DataAcesss.Entities.Enums.TransactionType.Refund,
                    Description = $"Hoàn trả chi phí (Budget) do hủy tin tuyển dụng: {job.Title}",
                    RelatedJobId = job.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Jobs.Remove(job);
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("JobCreated");
            return true;
        }

        public async Task<bool> ReportCompletionAsync(int id, string studentId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id);
            
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.InProgress) 
                return false;

            var app = await _context.Applications.Include(a => a.StudentProfile).FirstOrDefaultAsync(a => a.JobId == id && a.StudentProfile.UserId == studentId && a.Status == ApplicationStatus.Accepted);
            if (app == null) return false;

            app.Status = ApplicationStatus.Completed;

            // If ALL accepted apps for this job are completed, set job to PendingConfirmation
            var allApps = await _context.Applications.Where(a => a.JobId == id && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed)).ToListAsync();
            if (allApps.All(a => a.Status == ApplicationStatus.Completed))
            {
                job.Status = DataAcesss.Entities.Enums.JobStatus.PendingConfirmation;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveJobAsync(int id, string employerId)
        {
            var job = await _context.Jobs.Include(j => j.Applications).ThenInclude(a => a.StudentProfile).FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId);
            
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.PendingConfirmation) 
                return false;

            var acceptedApps = job.Applications.Where(a => a.Status == ApplicationStatus.Completed || a.Status == ApplicationStatus.Accepted).ToList();

            // Update Job Status
            job.Status = DataAcesss.Entities.Enums.JobStatus.Completed;

            var salaryPerPerson = Math.Round(job.Budget / (job.HeadCount > 0 ? job.HeadCount : 1), 0);
            var totalPaid = 0m;

            if (acceptedApps.Any())
            {
                foreach (var app in acceptedApps)
                {
                    bool alreadyPaid = (app.Status == ApplicationStatus.Completed && app.EscrowReleaseDate == null);

                    if (alreadyPaid) 
                    {
                        // Sinh viên đã được nhận tiền bởi EscrowAutoReleaseWorker
                        totalPaid += salaryPerPerson;
                        continue; // Bỏ qua, không chuyển tiền lần 2
                    }

                    app.EscrowReleaseDate = null;
                    app.Status = ApplicationStatus.Completed;
                    var studentId = app.StudentProfile?.UserId;
                    if (studentId != null)
                    {
                        var studentWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
                        if (studentWallet != null)
                        {
                            // Transfer money to student
                            studentWallet.Balance += salaryPerPerson;
                            totalPaid += salaryPerPerson;

                            _context.Transactions.Add(new Transaction
                            {
                                WalletId = studentWallet.Id,
                                Amount = salaryPerPerson,
                                Type = DataAcesss.Entities.Enums.TransactionType.EscrowRelease,
                                Description = $"Nhận tiền công từ công việc: {job.Title}",
                                RelatedJobId = job.Id,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }

            // Refund remaining budget to employer
            var refundAmount = Math.Round(job.Budget - totalPaid, 0);
            if (refundAmount > 0)
            {
                var employerWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
                if (employerWallet != null)
                {
                    employerWallet.Balance += refundAmount;
                    _context.Transactions.Add(new Transaction
                    {
                        WalletId = employerWallet.Id,
                        Amount = refundAmount,
                        Type = DataAcesss.Entities.Enums.TransactionType.Refund,
                        Description = $"Hoàn tiền dư từ công việc chưa tuyển đủ người: {job.Title}",
                        RelatedJobId = job.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", id);
            return true;
        }

        public async Task<bool> RejectCompletionAsync(int id, string employerId, JobDisputeCreateDto dto)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId);
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.PendingConfirmation)
                return false;

            job.Status = DataAcesss.Entities.Enums.JobStatus.Disputed;
            job.DisputeReason = dto.Reason;
            job.EmployerEvidenceText = dto.EvidenceText;
            job.EmployerEvidenceUrl = dto.EvidenceUrl;
            job.DisputedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", id);

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            return true;
        }

        public async Task<bool> StudentDisputeAsync(int jobId, string studentId, JobDisputeCreateDto dto)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
            if (job == null || (job.Status != DataAcesss.Entities.Enums.JobStatus.InProgress && job.Status != DataAcesss.Entities.Enums.JobStatus.PendingConfirmation))
                return false;

            var app = await _context.Applications.FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentProfile.UserId == studentId);
            if (app == null) return false;

            job.Status = DataAcesss.Entities.Enums.JobStatus.Disputed;
            job.DisputeReason = dto.Reason;
            job.StudentEvidenceText = dto.EvidenceText;
            job.StudentEvidenceUrl = dto.EvidenceUrl;
            job.DisputedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            return true;
        }

        public async Task<bool> SubmitStudentEvidenceAsync(int id, string studentId, StudentEvidenceSubmitDto dto)
        {
            var job = await _context.Jobs.Include(j => j.Applications).ThenInclude(a => a.StudentProfile).FirstOrDefaultAsync(j => j.Id == id);
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.Disputed)
                return false;

            var app = job.Applications.FirstOrDefault(a => a.StudentProfile?.UserId == studentId);
            if (app == null) return false;

            job.StudentEvidenceText = dto.EvidenceText;
            job.StudentEvidenceUrl = dto.EvidenceUrl;

            await _context.SaveChangesAsync();

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            return true;
        }

        private static JobDto MapToDto(Job j, bool isCompanyPremium = false)
        {
            var salaryRange = new List<decimal>();
            if (!string.IsNullOrEmpty(j.SalaryText) && j.SalaryText.Contains("-"))
            {
                var parts = j.SalaryText.Split('-');
                foreach (var part in parts)
                {
                    if (decimal.TryParse(part, out decimal val))
                        salaryRange.Add(val);
                }
            }

            return new JobDto
            {
                Id = j.Id,
                Title = j.Title,
                Description = j.Description,
                Location = j.Location,
                Type = j.Type,
                Category = j.Category,
                Salary = j.SalaryText,
                SalaryText = j.SalaryText,
                SalaryRange = salaryRange,
                Budget = j.Budget,
                Commission = j.Commission,
                PostedDate = DateTime.SpecifyKind(j.PostedDate, DateTimeKind.Utc),
                Deadline = j.Deadline,
                Views = j.Views,
                ApplicationsCount = j.ApplicationsCount,
                AcceptedCount = j.Applications?.Count(a => a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed) ?? 0,
                IsUrgent = j.IsUrgent,
                IsRemote = j.IsRemote,
                Status = j.Status,
                HeadCount = j.HeadCount,
                DisputeReason = j.DisputeReason,
                EmployerEvidenceText = j.EmployerEvidenceText,
                EmployerEvidenceUrl = j.EmployerEvidenceUrl,
                StudentEvidenceText = j.StudentEvidenceText,
                StudentEvidenceUrl = j.StudentEvidenceUrl,
                DisputedDate = j.DisputedDate,
                RequiredReliabilityScore = j.RequiredReliabilityScore,
                EmployerToStudentRating = j.EmployerToStudentRating,
                EmployerToStudentTags = j.EmployerToStudentTags,
                EmployerToStudentComment = j.EmployerToStudentComment,
                StudentToEmployerRating = j.StudentToEmployerRating,
                StudentToEmployerTags = j.StudentToEmployerTags,
                StudentToEmployerComment = j.StudentToEmployerComment,

                EmployerId = j.EmployerId,
                CompanyId = j.CompanyId,
                CompanyName = j.Company?.Name,
                CompanyLogoUrl = j.Company?.LogoUrl,
                CompanyDescription = j.Company?.Description,
                CompanyIndustry = j.Company?.Industry,
                CompanySize = j.Company?.Size,
                CompanyLocation = j.Company?.Location,
                CompanyWebsite = j.Company?.Website,
                IsCompanyPremium = isCompanyPremium,
                IsNew = (DateTime.UtcNow - j.PostedDate).TotalHours <= 24,
                WorkStartTime = j.WorkStartTime,
                WorkEndTime = j.WorkEndTime,
                WorkDate = j.WorkDate,
                WorkDays = j.WorkDays,
                EmployerType = j.Employer?.EmployerProfile != null ? (int)j.Employer.EmployerProfile.Type : 0,
                Tags = j.Tags?.Select(t => t.TagName).ToList() ?? new List<string>(),
                Requirements = j.Requirements?.Select(r => r.Content).ToList() ?? new List<string>(),
                Benefits = j.Benefits?.Select(b => b.Content).ToList() ?? new List<string>()
            };
        }

        public async Task<string?> GenerateCheckInOtpAsync(int jobId, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || (job.Status != JobStatus.InProgress && job.Status != JobStatus.Open)) return null;

            var otp = new Random().Next(100000, 999999).ToString();
            
            var apps = await _context.Applications.Where(a => a.JobId == jobId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed)).ToListAsync();
            foreach (var app in apps)
            {
                app.CheckInOtp = otp;
                app.CheckInOtpExpiredAt = DateTime.UtcNow.AddMinutes(3);
            }

            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<string?> GenerateCheckOutOtpAsync(int jobId, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || (job.Status != JobStatus.InProgress && job.Status != JobStatus.Open)) return null;

            var otp = new Random().Next(100000, 999999).ToString();
            var apps = await _context.Applications.Where(a => a.JobId == jobId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed)).ToListAsync();
            foreach (var app in apps)
            {
                app.CheckOutOtp = otp;
                app.CheckOutOtpExpiredAt = DateTime.UtcNow.AddMinutes(3);
            }

            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<bool> StudentCheckInAsync(int jobId, string studentId, string otp)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
            if (job == null || (job.Status != JobStatus.InProgress && job.Status != JobStatus.Open)) return false;

            var app = await _context.Applications.FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentProfile.UserId == studentId && a.Status == ApplicationStatus.Accepted);
            if (app == null) return false;

            if (app.CheckInOtp != otp || app.CheckInOtpExpiredAt < DateTime.UtcNow) return false;

            app.CheckInTime = DateTime.UtcNow;
            app.CheckInOtp = null; // Clear OTP after use
            app.CheckInOtpExpiredAt = null;
            
            if (job.Status == JobStatus.Open) {
                job.Status = JobStatus.InProgress;
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationCheckInOccurred", jobId);
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", jobId);
            return true;
        }

        public async Task<bool> StudentCheckOutAsync(int jobId, string studentId, string otp)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
            if (job == null || (job.Status != JobStatus.InProgress && job.Status != JobStatus.Open)) return false;

            var app = await _context.Applications.FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentProfile.UserId == studentId && a.Status == ApplicationStatus.Accepted);
            if (app == null) return false;

            if (app.CheckOutOtp != otp || app.CheckOutOtpExpiredAt < DateTime.UtcNow) return false;

            app.CheckOutTime = DateTime.UtcNow;
            app.CheckOutOtp = null; // Clear OTP after use
            app.CheckOutOtpExpiredAt = null;
            app.Status = ApplicationStatus.Completed; // Mark student's application as completed
            app.EscrowReleaseDate = DateTime.UtcNow.AddHours(24); // Set individual escrow release

            // If ALL accepted apps for this job are completed, set job to PendingConfirmation
            var allApps = await _context.Applications.Where(a => a.JobId == jobId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed)).ToListAsync();
            if (allApps.All(a => a.Status == ApplicationStatus.Completed))
            {
                job.Status = JobStatus.PendingConfirmation;
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationCheckOutOccurred", jobId);
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", jobId);
            return true;
        }

        public async Task<bool> CancelJobBookingAsync(int jobId, string userId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
            if (job == null || job.Status != JobStatus.InProgress) return false;

            var app = await _context.Applications.Include(a => a.StudentProfile).FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentProfile.UserId == userId && a.Status == ApplicationStatus.Accepted);
            
            if (app != null)
            {
                var studentProfile = app.StudentProfile;
                var studentUser = await _context.Users.FindAsync(userId);

                if (studentProfile != null)
                {
                    bool isEarlyCancel = job.Deadline.HasValue && DateTime.UtcNow < job.Deadline.Value.AddHours(-24);

                    if (isEarlyCancel)
                    {
                        studentProfile.ReliabilityScore -= 5;
                    }
                    else
                    {
                        studentProfile.ReliabilityScore -= 50;
                        if (studentUser != null)
                        {
                            studentUser.LockoutEnd = DateTimeOffset.UtcNow.AddDays(7);
                            studentUser.IsFlagged = true;
                            studentUser.FlagReason = "Hủy lịch hẹn sát giờ / No-show";
                        }
                    }

                    // Apply constraints check: if score falls below 0, pin to 0
                    if (studentProfile.ReliabilityScore < 0)
                    {
                        studentProfile.ReliabilityScore = 0;
                    }
                }

                app.Status = ApplicationStatus.Cancelled;

                // Reset job back to Open if no accepted applications left
                var otherAccepted = await _context.Applications.AnyAsync(a => a.JobId == jobId && a.Id != app.Id && a.Status == ApplicationStatus.Accepted);
                if (!otherAccepted)
                {
                    job.Status = JobStatus.Open;
                }

                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", jobId);
                return true;
            }

            return false;
        }

        public async Task<bool> SubmitEmployerReviewAsync(int jobId, string employerId, int rating, string tagsJson, string? comment)
        {
            var job = await _context.Jobs.Include(j => j.Applications).ThenInclude(a => a.StudentProfile).FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || job.Status != JobStatus.Completed) return false;

            var acceptedApps = job.Applications.Where(a => a.Status == ApplicationStatus.Completed).ToList();
            if (!acceptedApps.Any()) return false;

            job.EmployerToStudentRating = rating;
            job.EmployerToStudentTags = tagsJson;
            job.EmployerToStudentComment = comment;

            foreach (var app in acceptedApps)
            {
                var studentProfile = app.StudentProfile;
                if (studentProfile != null)
                {
                    if (rating == 5)
                    {
                        studentProfile.ReliabilityScore += 2;
                    }

                    // Check negative ratings/tags to auto-flag
                    var studentUser = await _context.Users.FindAsync(studentProfile.UserId);
                    if (studentUser != null)
                    {
                        bool hasBadTags = !string.IsNullOrEmpty(tagsJson) && (tagsJson.Contains("Đi muộn") || tagsJson.Contains("Ủa oải") || tagsJson.Contains("Thiếu tập trung") || tagsJson.Contains("Không hoàn thành việc"));
                        if (rating <= 2 || hasBadTags)
                        {
                            studentUser.IsFlagged = true;
                            studentUser.FlagReason = $"Nhận đánh giá tiêu cực ({rating} sao) hoặc tag xấu từ Nhà tuyển dụng.";
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SubmitStudentReviewAsync(int jobId, string studentId, int rating, string tagsJson, string? comment)
        {
            var job = await _context.Jobs.Include(j => j.Applications).ThenInclude(a => a.StudentProfile).FirstOrDefaultAsync(j => j.Id == jobId);
            if (job == null || job.Status != JobStatus.Completed) return false;

            var app = job.Applications.FirstOrDefault(a => a.StudentProfile?.UserId == studentId && a.Status == ApplicationStatus.Completed);
            if (app == null) return false;

            job.StudentToEmployerRating = rating;
            job.StudentToEmployerTags = tagsJson;
            job.StudentToEmployerComment = comment;

            // Process employer rating flag (optional check for employer rating average)
            var employerUser = await _context.Users.FindAsync(job.EmployerId);
            if (employerUser != null)
            {
                bool hasBadTags = !string.IsNullOrEmpty(tagsJson) && (tagsJson.Contains("Trễ giờ") || tagsJson.Contains("Khó tính") || tagsJson.Contains("Thiếu tôn trọng") || tagsJson.Contains("Yêu cầu quá cao"));
                if (rating <= 2 || hasBadTags)
                {
                    employerUser.IsFlagged = true;
                    employerUser.FlagReason = $"Nhận đánh giá tiêu cực ({rating} sao) hoặc tag xấu từ Sinh viên.";
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}

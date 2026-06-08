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

        public async Task<IEnumerable<JobDto>> GetJobsAsync(JobFilterDto filter)
        {
            var query = _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Tags)
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

            // Sorting and Pagination
            query = query.OrderByDescending(j => j.IsUrgent).ThenByDescending(j => j.PostedDate);
            
            var skip = (filter.Page - 1) * filter.PageSize;
            var jobs = await query.Skip(skip).Take(filter.PageSize).ToListAsync();

            return jobs.Select(MapToDto);
        }

        public async Task<JobDto?> GetJobByIdAsync(int id)
        {
            var job = await _context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Tags)
                .Include(j => j.Requirements)
                .Include(j => j.Benefits)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (job == null) return null;

            // Increment views
            job.Views++;
            await _context.SaveChangesAsync();

            return MapToDto(job);
        }

        public async Task<JobDto?> CreateJobAsync(string employerId, JobCreateDto dto)
        {
            // Find company id for this employer
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == employerId);
            if (profile == null || profile.CompanyId == null) return null;

            // Check Blacklist Count
            var user = await _context.Users.FindAsync(employerId);
            if (user != null && user.BlacklistCount >= 3)
            {
                throw new InvalidOperationException("Tài khoản của bạn đã bị khóa đăng việc do vi phạm chính sách của hệ thống.");
            }

            // Check Wallet Balance & Active subscription for posting fee
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
            var hasActivePackage = await _context.Subscriptions
                .AnyAsync(s => s.UserId == employerId && s.IsActive && s.EndDate > DateTime.UtcNow);
            decimal postingFee = hasActivePackage ? 0 : 2000;
            var totalCost = dto.Budget + dto.Commission + postingFee;
            
            if (wallet == null || wallet.Balance < totalCost)
            {
                throw new InvalidOperationException("Insufficient wallet balance to create this job.");
            }

            // Deduct from wallet
            wallet.Balance -= totalCost;

            var job = new Job
            {
                EmployerId = employerId,
                CompanyId = profile.CompanyId.Value,
                Title = dto.Title,
                Description = dto.Description,
                Location = dto.Location,
                Type = dto.Type,
                SalaryText = dto.SalaryRange.Any() ? string.Join("-", dto.SalaryRange) : dto.SalaryText,
                Budget = dto.Budget,
                Commission = dto.Commission,
                PostedDate = DateTime.UtcNow,
                Deadline = dto.Deadline,
                IsUrgent = dto.IsUrgent,
                IsRemote = dto.IsRemote,
                RequiredReliabilityScore = dto.RequiredReliabilityScore,
                Status = DataAcesss.Entities.Enums.JobStatus.Open,
                Tags = dto.Tags.Select(t => new JobTag { TagName = t }).ToList(),
                Requirements = dto.Requirements.Select(r => new JobRequirement { Content = r }).ToList(),
                Benefits = dto.Benefits.Select(b => new JobBenefit { Content = b }).ToList()
            };

            _context.Jobs.Add(job);
            await _context.SaveChangesAsync(); // Save to get Job Id

            // Create Escrow and Commission Transactions
            _context.Transactions.Add(new Transaction
            {
                WalletId = wallet.Id,
                Amount = -dto.Budget,
                Type = DataAcesss.Entities.Enums.TransactionType.EscrowHold,
                Description = $"Tạm giữ tiền lương cho công việc: {job.Title}",
                RelatedJobId = job.Id,
                CreatedAt = DateTime.UtcNow
            });

            _context.Transactions.Add(new Transaction
            {
                WalletId = wallet.Id,
                Amount = -dto.Commission,
                Type = DataAcesss.Entities.Enums.TransactionType.CommissionFee,
                Description = $"Phí nền tảng (10%) cho công việc: {job.Title}",
                RelatedJobId = job.Id,
                CreatedAt = DateTime.UtcNow
            });

            if (postingFee > 0)
            {
                _context.Transactions.Add(new Transaction
                {
                    WalletId = wallet.Id,
                    Amount = -postingFee,
                    Type = DataAcesss.Entities.Enums.TransactionType.PostingFee,
                    Description = $"Phí đăng tin (không mua gói) cho công việc: {job.Title}",
                    RelatedJobId = job.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("JobCreated");

            return MapToDto(job);
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
            job.SalaryText = dto.SalaryRange.Any() ? string.Join("-", dto.SalaryRange) : dto.SalaryText;
            job.Budget = dto.Budget;
            job.Commission = dto.Commission;
            job.Deadline = dto.Deadline;
            job.IsUrgent = dto.IsUrgent;
            job.IsRemote = dto.IsRemote;

            // Update collections
            _context.JobTags.RemoveRange(job.Tags);
            _context.JobRequirements.RemoveRange(job.Requirements);
            _context.JobBenefits.RemoveRange(job.Benefits);

            job.Tags = dto.Tags.Select(t => new JobTag { TagName = t }).ToList();
            job.Requirements = dto.Requirements.Select(r => new JobRequirement { Content = r }).ToList();
            job.Benefits = dto.Benefits.Select(b => new JobBenefit { Content = b }).ToList();

            await _context.SaveChangesAsync();
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
                var totalRefund = job.Budget + job.Commission;
                wallet.Balance += totalRefund;

                // Log Refund transaction
                _context.Transactions.Add(new Transaction
                {
                    WalletId = wallet.Id,
                    Amount = totalRefund,
                    Type = DataAcesss.Entities.Enums.TransactionType.Refund,
                    Description = $"Hoàn trả chi phí (Budget + Commission) do hủy tin tuyển dụng: {job.Title}",
                    RelatedJobId = job.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Jobs.Remove(job);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ReportCompletionAsync(int id, string studentId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.SelectedStudentId == studentId);
            
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.InProgress) 
                return false;

            job.Status = DataAcesss.Entities.Enums.JobStatus.PendingConfirmation;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveJobAsync(int id, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId);
            
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.PendingConfirmation || string.IsNullOrEmpty(job.SelectedStudentId)) 
                return false;

            // Update Job Status
            job.Status = DataAcesss.Entities.Enums.JobStatus.Completed;

            // Find Student's Wallet
            var studentWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == job.SelectedStudentId);
            if (studentWallet != null)
            {
                // Transfer money to student
                studentWallet.Balance += job.Budget;

                _context.Transactions.Add(new Transaction
                {
                    WalletId = studentWallet.Id,
                    Amount = job.Budget,
                    Type = DataAcesss.Entities.Enums.TransactionType.EscrowRelease,
                    Description = $"Nhận tiền công từ công việc: {job.Title}",
                    RelatedJobId = job.Id,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
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

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            return true;
        }

        public async Task<bool> SubmitStudentEvidenceAsync(int id, string studentId, StudentEvidenceSubmitDto dto)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.SelectedStudentId == studentId);
            if (job == null || job.Status != DataAcesss.Entities.Enums.JobStatus.Disputed)
                return false;

            job.StudentEvidenceText = dto.EvidenceText;
            job.StudentEvidenceUrl = dto.EvidenceUrl;

            await _context.SaveChangesAsync();

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("TransactionOccurred");

            return true;
        }

        private static JobDto MapToDto(Job j)
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
                SalaryText = j.SalaryText,
                SalaryRange = salaryRange,
                Budget = j.Budget,
                Commission = j.Commission,
                PostedDate = j.PostedDate,
                Deadline = j.Deadline,
                Views = j.Views,
                ApplicationsCount = j.ApplicationsCount,
                IsUrgent = j.IsUrgent,
                IsRemote = j.IsRemote,
                Status = j.Status,
                SelectedStudentId = j.SelectedStudentId,
                DisputeReason = j.DisputeReason,
                EmployerEvidenceText = j.EmployerEvidenceText,
                EmployerEvidenceUrl = j.EmployerEvidenceUrl,
                StudentEvidenceText = j.StudentEvidenceText,
                StudentEvidenceUrl = j.StudentEvidenceUrl,
                DisputedDate = j.DisputedDate,

                CheckInTime = j.CheckInTime,
                CheckOutTime = j.CheckOutTime,
                CheckInOtp = j.CheckInOtp,
                CheckInOtpExpiredAt = j.CheckInOtpExpiredAt,
                CheckOutOtp = j.CheckOutOtp,
                CheckOutOtpExpiredAt = j.CheckOutOtpExpiredAt,
                EscrowReleaseDate = j.EscrowReleaseDate,
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
                Tags = j.Tags?.Select(t => t.TagName).ToList() ?? new List<string>(),
                Requirements = j.Requirements?.Select(r => r.Content).ToList() ?? new List<string>(),
                Benefits = j.Benefits?.Select(b => b.Content).ToList() ?? new List<string>()
            };
        }

        public async Task<string?> GenerateCheckInOtpAsync(int jobId, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || job.Status != JobStatus.InProgress) return null;

            var otp = new Random().Next(100000, 999999).ToString();
            job.CheckInOtp = otp;
            job.CheckInOtpExpiredAt = DateTime.UtcNow.AddMinutes(3);

            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<string?> GenerateCheckOutOtpAsync(int jobId, string employerId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || job.Status != JobStatus.InProgress) return null;

            var otp = new Random().Next(100000, 999999).ToString();
            job.CheckOutOtp = otp;
            job.CheckOutOtpExpiredAt = DateTime.UtcNow.AddMinutes(3);

            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<bool> StudentCheckInAsync(int jobId, string studentId, string otp)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.SelectedStudentId == studentId);
            if (job == null || job.Status != JobStatus.InProgress) return false;

            if (job.CheckInOtp != otp || job.CheckInOtpExpiredAt < DateTime.UtcNow) return false;

            job.CheckInTime = DateTime.UtcNow;
            job.CheckInOtp = null; // Clear OTP after use
            job.CheckInOtpExpiredAt = null;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> StudentCheckOutAsync(int jobId, string studentId, string otp)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.SelectedStudentId == studentId);
            if (job == null || job.Status != JobStatus.InProgress) return false;

            if (job.CheckOutOtp != otp || job.CheckOutOtpExpiredAt < DateTime.UtcNow) return false;

            job.CheckOutTime = DateTime.UtcNow;
            job.CheckOutOtp = null; // Clear OTP after use
            job.CheckOutOtpExpiredAt = null;

            // Automatically transition to PendingConfirmation (Pending Escrow)
            job.Status = JobStatus.PendingConfirmation;
            // Set release time to 24 hours from now
            job.EscrowReleaseDate = DateTime.UtcNow.AddHours(24);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CancelJobBookingAsync(int jobId, string userId)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && (j.SelectedStudentId == userId || j.EmployerId == userId));
            if (job == null || job.Status != JobStatus.InProgress) return false;

            // Check if it's the student canceling
            if (job.SelectedStudentId == userId)
            {
                var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
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

                // Reset job back to Open so other students can apply
                job.Status = JobStatus.Open;
                job.SelectedStudentId = null;
                job.CheckInTime = null;
                job.CheckOutTime = null;
                job.CheckInOtp = null;
                job.CheckOutOtp = null;

                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<bool> SubmitEmployerReviewAsync(int jobId, string employerId, int rating, string tagsJson, string? comment)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null || job.Status != JobStatus.Completed || string.IsNullOrEmpty(job.SelectedStudentId)) return false;

            job.EmployerToStudentRating = rating;
            job.EmployerToStudentTags = tagsJson;
            job.EmployerToStudentComment = comment;

            // Process reliability score adjustments
            var studentProfile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == job.SelectedStudentId);
            if (studentProfile != null)
            {
                if (rating == 5)
                {
                    studentProfile.ReliabilityScore += 2;
                }

                // Check negative ratings/tags to auto-flag
                var studentUser = await _context.Users.FindAsync(job.SelectedStudentId);
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

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SubmitStudentReviewAsync(int jobId, string studentId, int rating, string tagsJson, string? comment)
        {
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.SelectedStudentId == studentId);
            if (job == null || job.Status != JobStatus.Completed) return false;

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

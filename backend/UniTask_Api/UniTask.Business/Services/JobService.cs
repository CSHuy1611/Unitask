using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Job;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
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

            // Check Wallet Balance
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == employerId);
            var totalCost = dto.Budget + dto.Commission;
            
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
                EmployerId = j.EmployerId,
                CompanyId = j.CompanyId,
                CompanyName = j.Company?.Name,
                CompanyLogoUrl = j.Company?.LogoUrl,
                Tags = j.Tags?.Select(t => t.TagName).ToList() ?? new List<string>(),
                Requirements = j.Requirements?.Select(r => r.Content).ToList() ?? new List<string>(),
                Benefits = j.Benefits?.Select(b => b.Content).ToList() ?? new List<string>()
            };
        }
    }
}

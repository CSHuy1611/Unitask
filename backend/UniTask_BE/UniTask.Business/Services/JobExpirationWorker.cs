using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class JobExpirationWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<JobExpirationWorker> _logger;

        public JobExpirationWorker(IServiceScopeFactory scopeFactory, ILogger<JobExpirationWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("JobExpirationWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredJobsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in JobExpirationWorker execution.");
                }

                // Check every hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task ProcessExpiredJobsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;

            // Find jobs that are Open or InProgress and have passed their deadline
            var expiredJobs = await context.Jobs
                .Include(j => j.Applications)
                    .ThenInclude(a => a.StudentProfile)
                .Where(j => (j.Status == JobStatus.Open || j.Status == JobStatus.InProgress) && j.Deadline != null && j.Deadline < now)
                .ToListAsync();

            if (expiredJobs.Any())
            {
                _logger.LogInformation($"Found {expiredJobs.Count} expired jobs. Processing...");

                foreach (var job in expiredJobs)
                {
                    var acceptedApps = job.Applications.Where(a => a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed).ToList();

                    if (!acceptedApps.Any())
                    {
                        // No one accepted -> Cancel job and refund 100% budget
                        job.Status = JobStatus.Closed;

                        var employerWallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == job.EmployerId);
                        if (employerWallet != null && job.Budget > 0)
                        {
                            employerWallet.Balance += job.Budget;
                            context.Transactions.Add(new Transaction
                            {
                                WalletId = employerWallet.Id,
                                Amount = job.Budget,
                                Type = TransactionType.Refund,
                                Description = $"Hoàn tiền công việc hết hạn (không có ứng viên): {job.Title}",
                                RelatedJobId = job.Id,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                    else
                    {
                        // Some people were accepted -> Move job to PendingConfirmation to lock it
                        // The employer must approve, or EscrowAutoReleaseWorker will eventually release it
                        job.Status = JobStatus.PendingConfirmation;

                        // Reject all pending applications
                        var pendingApps = job.Applications.Where(a => a.Status == ApplicationStatus.Applied || a.Status == ApplicationStatus.Interviewing).ToList();
                        foreach (var app in pendingApps)
                        {
                            app.Status = ApplicationStatus.Rejected;
                        }

                        // Xử lý tự động trừ điểm uy tín cho sinh viên vắng mặt (không đi làm) hoặc thiếu checkout
                        var acceptedAppsForScore = job.Applications.Where(a => a.Status == ApplicationStatus.Accepted).ToList();
                        foreach (var app in acceptedAppsForScore)
                        {
                            var studentProfile = app.StudentProfile;
                            if (studentProfile != null)
                            {
                                if (app.CheckInTime == null && app.CheckOutTime == null)
                                {
                                    // Hoàn toàn không đi làm: chuyển trạng thái đơn sang NoShow và trừ 2 điểm
                                    app.Status = ApplicationStatus.NoShow;
                                    studentProfile.ReliabilityScore = Math.Max(0, studentProfile.ReliabilityScore - 2);

                                    if (studentProfile.ReliabilityScore < 80 && (!studentProfile.ReliabilityBlockedUntil.HasValue || DateTime.UtcNow >= studentProfile.ReliabilityBlockedUntil.Value))
                                    {
                                        studentProfile.ReliabilityBlockedUntil = DateTime.UtcNow.AddDays(3);
                                    }
                                }
                                else if (app.CheckInTime != null && app.CheckOutTime == null)
                                {
                                    // Có check-in nhưng không checkout: trừ 1 điểm vì lỗi checkout sớm/thiếu
                                    studentProfile.ReliabilityScore = Math.Max(0, studentProfile.ReliabilityScore - 1);

                                    if (studentProfile.ReliabilityScore < 80 && (!studentProfile.ReliabilityBlockedUntil.HasValue || DateTime.UtcNow >= studentProfile.ReliabilityBlockedUntil.Value))
                                    {
                                        studentProfile.ReliabilityBlockedUntil = DateTime.UtcNow.AddDays(3);
                                    }
                                }
                            }
                        }
                    }
                }

                await context.SaveChangesAsync();
                _logger.LogInformation("Processed expired jobs successfully.");
            }
        }
    }
}

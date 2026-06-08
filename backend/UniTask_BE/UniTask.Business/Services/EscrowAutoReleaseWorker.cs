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
    public class EscrowAutoReleaseWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<EscrowAutoReleaseWorker> _logger;

        public EscrowAutoReleaseWorker(IServiceScopeFactory scopeFactory, ILogger<EscrowAutoReleaseWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("EscrowAutoReleaseWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await AutoReleaseEscrowsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in EscrowAutoReleaseWorker execution.");
                }

                // Check every minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task AutoReleaseEscrowsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;
            var jobsToRelease = await context.Jobs
                .Where(j => j.Status == JobStatus.PendingConfirmation && j.EscrowReleaseDate != null && j.EscrowReleaseDate <= now && j.SelectedStudentId != null)
                .ToListAsync();

            if (jobsToRelease.Any())
            {
                _logger.LogInformation($"Found {jobsToRelease.Count} jobs with expired escrow periods. Releasing funds...");

                foreach (var job in jobsToRelease)
                {
                    job.Status = JobStatus.Completed;
                    job.EscrowReleaseDate = null; // Clear release date

                    var studentWallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == job.SelectedStudentId);
                    if (studentWallet != null)
                    {
                        studentWallet.Balance += job.Budget;

                        context.Transactions.Add(new Transaction
                        {
                            WalletId = studentWallet.Id,
                            Amount = job.Budget,
                            Type = TransactionType.EscrowRelease,
                            Description = $"[System Auto-Release] Nhận tiền công tự động từ công việc: {job.Title}",
                            RelatedJobId = job.Id,
                            CreatedAt = DateTime.UtcNow
                        });

                        // Add +5 Reliability Score for completing job
                        var studentProfile = await context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == job.SelectedStudentId);
                        if (studentProfile != null)
                        {
                            studentProfile.ReliabilityScore += 5;
                        }
                    }
                }

                await context.SaveChangesAsync();
                _logger.LogInformation("Released all expired escrows successfully.");
            }
        }
    }
}

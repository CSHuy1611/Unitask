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
            
            var appsToRelease = await context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile)
                .Where(a => a.Status == ApplicationStatus.Completed && a.EscrowReleaseDate != null && a.EscrowReleaseDate <= now)
                .ToListAsync();

            if (appsToRelease.Any())
            {
                _logger.LogInformation($"Found {appsToRelease.Count} applications with expired escrow periods. Releasing funds...");

                foreach (var app in appsToRelease)
                {
                    app.EscrowReleaseDate = null; // Clear release date

                    if (app.StudentProfile?.UserId != null)
                    {
                        var studentWallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == app.StudentProfile.UserId);
                        if (studentWallet != null)
                        {
                            var portion = app.Job.Budget / (app.Job.HeadCount > 0 ? app.Job.HeadCount : 1);
                            var roundedBudget = Math.Round(portion, 0);
                            
                            studentWallet.Balance += roundedBudget;

                            context.Transactions.Add(new Transaction
                            {
                                WalletId = studentWallet.Id,
                                Amount = roundedBudget,
                                Type = TransactionType.EscrowRelease,
                                Description = $"[System Auto-Release] Nhận tiền công tự động từ công việc: {app.Job.Title}",
                                RelatedJobId = app.Job.Id,
                                CreatedAt = DateTime.UtcNow
                            });

                        }
                    }

                    // Complete the Job if all apps are released
                    var otherAppsWithEscrow = await context.Applications.AnyAsync(a => a.JobId == app.JobId && a.Id != app.Id && a.EscrowReleaseDate != null);
                    var anyPending = await context.Applications.AnyAsync(a => a.JobId == app.JobId && a.Status == ApplicationStatus.Accepted);
                    
                    // If no other apps are pending or waiting for escrow release
                    if (!otherAppsWithEscrow && !anyPending && (app.Job.Status == JobStatus.PendingConfirmation || app.Job.Status == JobStatus.InProgress))
                    {
                        app.Job.Status = JobStatus.Completed;

                        // Calculate total paid and refund the rest
                        var completedAppsCount = await context.Applications.CountAsync(a => a.JobId == app.JobId && a.Status == ApplicationStatus.Completed);
                        var salaryPerPerson = Math.Round(app.Job.Budget / (app.Job.HeadCount > 0 ? app.Job.HeadCount : 1), 0);
                        var totalPaid = completedAppsCount * salaryPerPerson; // Approximated. In real case we might want to sum Transactions.
                        
                        var refundAmount = Math.Round(app.Job.Budget - totalPaid, 0);
                        if (refundAmount > 0)
                        {
                            var employerWallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == app.Job.EmployerId);
                            if (employerWallet != null)
                            {
                                employerWallet.Balance += refundAmount;
                                context.Transactions.Add(new Transaction
                                {
                                    WalletId = employerWallet.Id,
                                    Amount = refundAmount,
                                    Type = TransactionType.Refund,
                                    Description = $"Hoàn tiền dư tự động do không đủ người hoàn thành công việc: {app.Job.Title}",
                                    RelatedJobId = app.Job.Id,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }
                }

                await context.SaveChangesAsync();
                _logger.LogInformation("Released all expired escrows successfully.");
            }
        }
    }
}

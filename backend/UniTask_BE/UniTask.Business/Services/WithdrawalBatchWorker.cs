using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class WithdrawalBatchWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<WithdrawalBatchWorker> _logger;
        private DateTime _lastRunDate = DateTime.MinValue;

        public WithdrawalBatchWorker(IServiceScopeFactory scopeFactory, ILogger<WithdrawalBatchWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WithdrawalBatchWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = DateTime.UtcNow.AddHours(7); // Vietnam Time (UTC +7)
                    int lastDay = DateTime.DaysInMonth(now.Year, now.Month);

                    // Check if it's the last day of the month at 17:00 (5 PM)
                    if (now.Day == lastDay && now.Hour == 17 && _lastRunDate.Date != now.Date)
                    {
                        _logger.LogInformation("Scheduled end-of-month withdrawal batch process starting...");
                        await ProcessBatchAsync();
                        _lastRunDate = now;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in WithdrawalBatchWorker execution.");
                }

                // Check every 10 minutes
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }

        public async Task ProcessBatchAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var pendingWithdrawals = await context.Transactions
                .Where(t => t.Type == TransactionType.Withdrawal && t.Description != null && t.Description.StartsWith("[Pending]"))
                .ToListAsync();

            if (pendingWithdrawals.Any())
            {
                foreach (var tx in pendingWithdrawals)
                {
                    string cleanDesc = tx.Description!.Substring("[Pending]".Length).Trim();
                    tx.Description = "[Processing] " + cleanDesc;
                }

                await context.SaveChangesAsync();
                _logger.LogInformation($"Successfully batched {pendingWithdrawals.Count} withdrawal requests into 'Processing' status.");
            }
        }
    }
}

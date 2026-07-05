using UniTask.Business.DTOs.Admin;
using UniTask.Business.DTOs.Subscription;

namespace UniTask.Business.Interfaces
{
    public interface IAdminService
    {
        Task<object> GetDashboardStatsAsync();
        Task<object> GetAllUsersAsync(int page = 1, int pageSize = 10);
        Task<bool> ForceVerifyUserAsync(string userId);
        
        // Package Management
        Task<ServicePackageDto> CreatePackageAsync(ServicePackageCreateDto dto);
        Task<bool> UpdatePackageAsync(int id, ServicePackageUpdateDto dto);
        Task<bool> DeletePackageAsync(int id);

        // Withdrawal Payout Management
        Task<object> GetWithdrawalsAsync(int page = 1, int pageSize = 10);
        Task<bool> CompleteWithdrawalAsync(int transactionId);
        Task<bool> BatchProcessWithdrawalsAsync();
        Task<bool> RejectWithdrawalAsync(int transactionId, string reason);

        // Dispute Management
        Task<object> GetDisputesAsync(int page = 1, int pageSize = 10);
        Task<bool> ResolveDisputeAsync(int jobId, DisputeResolveDto dto);

        // Revenue & Cashflow
        Task<object> GetTransactionsAsync(int page = 1, int pageSize = 10, string? type = null);
        Task<byte[]> ExportRevenueReportExcelAsync(DateTime? startDate, DateTime? endDate);
        Task<object> GetPayosDepositsAsync(int page = 1, int pageSize = 10);
    }
}

using UniTask.Business.DTOs.Admin;
using UniTask.Business.DTOs.Subscription;

namespace UniTask.Business.Interfaces
{
    public interface IAdminService
    {
        Task<object> GetDashboardStatsAsync();
        Task<object> GetAllUsersAsync(int page = 1, int pageSize = 10);
        
        // Package Management
        Task<ServicePackageDto> CreatePackageAsync(ServicePackageCreateDto dto);
        Task<bool> UpdatePackageAsync(int id, ServicePackageUpdateDto dto);
        Task<bool> DeletePackageAsync(int id);

        // Withdrawal Payout Management
        Task<object> GetWithdrawalsAsync(int page = 1, int pageSize = 10);
        Task<bool> CompleteWithdrawalAsync(int transactionId);
        Task<bool> BatchProcessWithdrawalsAsync();

        // Dispute Management
        Task<object> GetDisputesAsync(int page = 1, int pageSize = 10);
        Task<bool> ResolveDisputeAsync(int jobId, DisputeResolveDto dto);
    }
}

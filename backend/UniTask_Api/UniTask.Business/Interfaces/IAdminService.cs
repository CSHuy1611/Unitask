using UniTask.Business.DTOs.Admin;
using UniTask.Business.DTOs.Subscription;

namespace UniTask.Business.Interfaces
{
    public interface IAdminService
    {
        Task<object> GetDashboardStatsAsync();
        Task<IEnumerable<object>> GetAllUsersAsync();
        
        // Package Management
        Task<ServicePackageDto> CreatePackageAsync(ServicePackageCreateDto dto);
        Task<bool> UpdatePackageAsync(int id, ServicePackageUpdateDto dto);
        Task<bool> DeletePackageAsync(int id);

        // Withdrawal Payout Management
        Task<IEnumerable<object>> GetWithdrawalsAsync();
        Task<bool> CompleteWithdrawalAsync(int transactionId);
    }
}

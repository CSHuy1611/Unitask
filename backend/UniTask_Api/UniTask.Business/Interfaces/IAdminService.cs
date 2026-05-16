using UniTask.Business.DTOs.Admin;
using UniTask.Business.DTOs.Subscription;

namespace UniTask.Business.Interfaces
{
    public interface IAdminService
    {
        Task<DashboardStatsDto> GetDashboardStatsAsync();
        
        // Package Management
        Task<ServicePackageDto> CreatePackageAsync(ServicePackageCreateDto dto);
        Task<bool> UpdatePackageAsync(int id, ServicePackageUpdateDto dto);
        Task<bool> DeletePackageAsync(int id);
    }
}

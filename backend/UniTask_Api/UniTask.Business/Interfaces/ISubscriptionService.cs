using UniTask.Business.DTOs.Subscription;

namespace UniTask.Business.Interfaces
{
    public interface ISubscriptionService
    {
        Task<IEnumerable<ServicePackageDto>> GetPackagesAsync();
        Task<bool> SubscribeAsync(string employerId, int packageId);
    }
}

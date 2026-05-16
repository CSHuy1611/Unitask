using UniTask.Business.DTOs.Job;

namespace UniTask.Business.Interfaces
{
    public interface ISavedJobService
    {
        Task<bool> SaveJobAsync(string studentId, int jobId);
        Task<bool> UnsaveJobAsync(string studentId, int jobId);
        Task<IEnumerable<JobDto>> GetSavedJobsAsync(string studentId);
        Task<bool> IsJobSavedAsync(string studentId, int jobId);
    }
}

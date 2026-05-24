using UniTask.Business.DTOs.Job;

namespace UniTask.Business.Interfaces
{
    public interface IJobService
    {
        Task<IEnumerable<JobDto>> GetJobsAsync(JobFilterDto filter);
        Task<JobDto?> GetJobByIdAsync(int id);
        Task<JobDto?> CreateJobAsync(string employerId, JobCreateDto dto);
        Task<bool> UpdateJobAsync(int id, string employerId, JobUpdateDto dto);
        Task<bool> DeleteJobAsync(int id, string employerId);
        Task<bool> ReportCompletionAsync(int id, string studentId);
        Task<bool> ApproveJobAsync(int id, string employerId);
        Task<bool> RejectCompletionAsync(int id, string employerId, JobDisputeCreateDto dto);
        Task<bool> SubmitStudentEvidenceAsync(int id, string studentId, StudentEvidenceSubmitDto dto);
    }
}

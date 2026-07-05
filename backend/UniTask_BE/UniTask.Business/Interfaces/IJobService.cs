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
        Task<bool> StudentDisputeAsync(int jobId, string studentId, JobDisputeCreateDto dto);

        // Check-in / Check-out OTP
        Task<string?> GenerateCheckInOtpAsync(int jobId, string employerId);
        Task<string?> GenerateCheckOutOtpAsync(int jobId, string employerId);
        Task<bool> StudentCheckInAsync(int jobId, string studentId, string otp);
        Task<bool> StudentCheckOutAsync(int jobId, string studentId, string otp);

        // Cancellation
        Task<bool> CancelJobBookingAsync(int jobId, string userId);

        // Two-way rating
        Task<bool> SubmitEmployerReviewAsync(int jobId, string employerId, int rating, string tagsJson, string? comment);
        Task<bool> SubmitStudentReviewAsync(int jobId, string studentId, int rating, string tagsJson, string? comment);
    }
}

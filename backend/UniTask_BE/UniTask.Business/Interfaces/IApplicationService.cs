using UniTask.Business.DTOs.Application;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Interfaces
{
    public interface IApplicationService
    {
        Task<ApplicationDto?> ApplyJobAsync(int jobId, string studentId, ApplicationCreateDto dto);
        Task<IEnumerable<ApplicationDto>> GetApplicationsForJobAsync(int jobId, string employerId);
        Task<IEnumerable<ApplicationDto>> GetStudentApplicationsAsync(string studentId);
        Task<bool> UpdateApplicationStatusAsync(int applicationId, string employerId, ApplicationStatus status);
        
        Task<string?> GenerateOtpAsync(int applicationId, string employerId, string otpType);
        Task<CheckInOutResponseDto> StudentCheckInAsync(int applicationId, string studentId, string otp);
        Task<CheckInOutResponseDto> StudentCheckOutAsync(int applicationId, string studentId, string otp);
        Task<bool> ReportNoShowAsync(int applicationId, string employerId, string reason, string evidenceUrl);
        Task<bool> ApproveCompletionAsync(int applicationId, string employerId);
    }
}

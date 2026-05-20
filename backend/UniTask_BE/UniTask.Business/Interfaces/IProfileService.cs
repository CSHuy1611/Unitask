using UniTask.Business.DTOs.Profile;

namespace UniTask.Business.Interfaces
{
    public interface IProfileService
    {
        Task<object?> GetProfileAsync(string userId);
        Task<bool> UpdateStudentProfileAsync(string userId, StudentProfileUpdateDto dto);
        Task<bool> UpdateEmployerProfileAsync(string userId, EmployerProfileUpdateDto dto);
        Task<bool> UpdateEkycAsync(string userId, EkycUpdateDto dto);

        // Admin eKYC
        Task<IEnumerable<object>> GetPendingEkycAsync();
        Task<bool> ApproveEkycAsync(string userId);
        Task<bool> RejectEkycAsync(string userId);

        // CV Upload
        Task<string?> UploadCvAsync(string userId, Microsoft.AspNetCore.Http.IFormFile cvFile);
        Task<bool> DeleteCvAsync(string userId);
    }
}

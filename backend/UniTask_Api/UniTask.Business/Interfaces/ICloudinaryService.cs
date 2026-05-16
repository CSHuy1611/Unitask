using Microsoft.AspNetCore.Http;

namespace UniTask.Business.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string?> UploadImageAsync(IFormFile file, string folder);
        Task<string?> UploadFileAsync(IFormFile file, string folder);
        Task<bool> DeleteImageAsync(string publicId);
        string? GetPublicIdFromUrl(string url);
    }
}

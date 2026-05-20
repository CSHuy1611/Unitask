using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using UniTask.Business.Interfaces;

namespace UniTask.Business.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            var acc = new Account(
                configuration["Cloudinary:CloudName"],
                configuration["Cloudinary:ApiKey"],
                configuration["Cloudinary:ApiSecret"]
            );

            _cloudinary = new Cloudinary(acc);
        }

        public async Task<string?> UploadImageAsync(IFormFile file, string folder)
        {
            if (file.Length <= 0) return null;

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"UniTask/{folder}",
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception(uploadResult.Error.Message);
            }

            return uploadResult.SecureUrl.ToString();
        }

        public async Task<string?> UploadFileAsync(IFormFile file, string folder)
        {
            if (file.Length <= 0) return null;

            using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"UniTask/{folder}"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception(uploadResult.Error.Message);
            }

            return uploadResult.SecureUrl.ToString();
        }

        public async Task<bool> DeleteImageAsync(string publicId)
        {
            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);
            return result.Result == "ok";
        }

        public string? GetPublicIdFromUrl(string url)
        {
            if (string.IsNullOrEmpty(url)) return null;

            // Cloudinary URLs usually look like: .../v1234567/UniTask/Avatar/filename.jpg
            // We need: UniTask/Avatar/filename
            try
            {
                var parts = url.Split('/');
                var filenameWithExtension = parts[^1];
                var filename = filenameWithExtension.Split('.')[0];
                
                // Find where UniTask starts
                int startIndex = -1;
                for(int i = 0; i < parts.Length; i++)
                {
                    if (parts[i] == "UniTask")
                    {
                        startIndex = i;
                        break;
                    }
                }

                if (startIndex != -1)
                {
                    var publicIdParts = parts.Skip(startIndex).Take(parts.Length - 1 - startIndex).ToList();
                    publicIdParts.Add(filename);
                    return string.Join("/", publicIdParts);
                }
            }
            catch
            {
                // Fallback or log error
            }

            return null;
        }
    }
}

using Microsoft.AspNetCore.Http;

namespace UniTask.Business.DTOs.Profile
{
    public class EkycUpdateDto
    {
        public IFormFile FrontImage { get; set; } = null!;
        public IFormFile BackImage { get; set; } = null!;
        public IFormFile SelfieImage { get; set; } = null!;
        public string? CccdNumber { get; set; }
        public string? FaceDescriptor { get; set; }
    }
}

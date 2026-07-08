using Microsoft.AspNetCore.Http;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Profile
{
    public class EmployerProfileUpdateDto
    {
        public EmployerType? EmployerType { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Position { get; set; }
        
        // Company info
        public string? CompanyName { get; set; }
        public string? Industry { get; set; }
        public string? Size { get; set; }
        public string? Location { get; set; }
        public string? Description { get; set; }
        public string? Website { get; set; }
        public string? Email { get; set; }
        public string? TaxCode { get; set; }
        // Files
        public IFormFile? AvatarFile { get; set; }
        public IFormFile? CompanyLogoFile { get; set; }
    }
}

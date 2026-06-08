using Microsoft.AspNetCore.Http;

namespace UniTask.Business.DTOs.Profile
{
    public class StudentProfileUpdateDto
    {
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? University { get; set; }
        public string? Major { get; set; }
        public int? Year { get; set; }
        public decimal? GPA { get; set; }
        public string? Skills { get; set; } // JSON string or comma separated
        public string? Bio { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public DateTime? DateOfBirth { get; set; }

        // Files
        public IFormFile? AvatarFile { get; set; }
    }
}

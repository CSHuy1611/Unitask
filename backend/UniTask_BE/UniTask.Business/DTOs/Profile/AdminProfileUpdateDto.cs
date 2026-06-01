using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Profile
{
    public class AdminProfileUpdateDto
    {
        [Required(ErrorMessage = "FullName is required")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email address")]
        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public IFormFile? AvatarFile { get; set; }
    }
}

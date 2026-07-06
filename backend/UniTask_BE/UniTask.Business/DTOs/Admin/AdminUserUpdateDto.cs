using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Admin
{
    public class AdminUserUpdateDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Hồ sơ nhà tuyển dụng - Quan hệ 1-1 với ApplicationUser, N-1 với Company.
    /// Maps from Angular: companyId, companyName, position.
    /// </summary>
    public class EmployerProfile
    {
        [Key]
        public int Id { get; set; }

        // FK to ApplicationUser
        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public ApplicationUser User { get; set; } = null!;

        // FK to Company
        public int? CompanyId { get; set; }

        [ForeignKey(nameof(CompanyId))]
        public Company? Company { get; set; }

        [MaxLength(200)]
        public string? Position { get; set; }
    }
}

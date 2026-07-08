using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

using UniTask.DataAcesss.Entities.Enums;

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

        public EmployerType Type { get; set; } = EmployerType.Business;

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

        // ===== Business License =====
        public string? BusinessLicenseUrl { get; set; }
        public bool IsBusinessLicenseVerified { get; set; } = false;
    }
}

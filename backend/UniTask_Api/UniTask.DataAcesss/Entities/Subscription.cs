using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Theo dõi gói dịch vụ mà nhà tuyển dụng đã đăng ký.
    /// Maps from Angular: User.activePackage, User.packageExpiry.
    /// </summary>
    public class Subscription
    {
        [Key]
        public int Id { get; set; }

        // FK to ApplicationUser
        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public ApplicationUser User { get; set; } = null!;

        // FK to ServicePackage
        public int PackageId { get; set; }

        [ForeignKey(nameof(PackageId))]
        public ServicePackage Package { get; set; } = null!;

        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Gói dịch vụ cho nhà tuyển dụng.
    /// Maps from Angular: admin-dashboard packages table (name, duration, price, description, subscribers).
    /// </summary>
    public class ServicePackage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,0)")]
        public decimal Price { get; set; }

        /// <summary>
        /// Thời hạn gói (tính bằng tháng).
        /// </summary>
        public int DurationMonths { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ===== Navigation Properties =====
        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
}

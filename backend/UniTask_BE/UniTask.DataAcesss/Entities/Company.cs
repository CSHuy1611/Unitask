using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Thông tin công ty / doanh nghiệp.
    /// Maps from Angular: Company model (name, logo, industry, size, location, description, website, rating, isVerified).
    /// </summary>
    public class Company
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Cloudinary URL - Logo công ty.
        /// </summary>
        public string? LogoUrl { get; set; }

        [MaxLength(200)]
        public string? Industry { get; set; }

        [MaxLength(100)]
        public string? Size { get; set; }

        [MaxLength(300)]
        public string? Location { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? Website { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal Rating { get; set; } = 0;

        public bool IsVerified { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ===== Navigation Properties =====
        public ICollection<EmployerProfile> Employers { get; set; } = new List<EmployerProfile>();
        public ICollection<Job> Jobs { get; set; } = new List<Job>();
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Hồ sơ sinh viên - Quan hệ 1-1 với ApplicationUser.
    /// Lưu trữ các thông tin đặc thù cho vai trò Student.
    /// Maps from Angular: university, major, year, gpa, skills, bio, cvFileName, address, dateOfBirth.
    /// </summary>
    public class StudentProfile
    {
        [Key]
        public int Id { get; set; }

        // FK to ApplicationUser
        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public ApplicationUser User { get; set; } = null!;

        [MaxLength(200)]
        public string? University { get; set; }

        [MaxLength(200)]
        public string? Major { get; set; }

        public int? Year { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal? GPA { get; set; }

        /// <summary>
        /// Kỹ năng - lưu dạng JSON array trong DB, ví dụ: ["C#","Angular","SQL"].
        /// </summary>
        public string? Skills { get; set; }

        [MaxLength(1000)]
        public string? Bio { get; set; }

        /// <summary>
        /// Cloudinary URL hoặc tên file CV đã upload.
        /// </summary>
        public string? CVUrl { get; set; }
        public DateTime? CVUploadDate { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public int ReliabilityScore { get; set; } = 100;

        // ===== Navigation Properties =====
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<SavedJob> SavedJobs { get; set; } = new List<SavedJob>();
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Bài đăng tuyển dụng / công việc.
    /// Maps from Angular: Job model - bao gồm title, company, location, type, salary, budget,
    /// commission, status, description, deadline, views, applications, isUrgent, isRemote, selectedStudentId.
    /// </summary>
    public class Job
    {
        [Key]
        public int Id { get; set; }

        // FK - Employer đã đăng bài
        [Required]
        public string EmployerId { get; set; } = string.Empty;

        [ForeignKey(nameof(EmployerId))]
        public ApplicationUser Employer { get; set; } = null!;

        // FK - Công ty liên kết
        public int CompanyId { get; set; }

        [ForeignKey(nameof(CompanyId))]
        public Company Company { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(5000)]
        public string? Description { get; set; }

        [MaxLength(300)]
        public string? Location { get; set; }

        /// <summary>
        /// Loại hình công việc: Thực tập, Part-time, Freelance, Full-time.
        /// </summary>
        [MaxLength(100)]
        public string Type { get; set; } = "Part-time";

        /// <summary>
        /// Danh mục công việc: Marketing & Content, IT & Công nghệ, v.v.
        /// </summary>
        [MaxLength(200)]
        public string Category { get; set; } = string.Empty;

        /// <summary>
        /// Mức lương hiển thị dạng text (VD: "5 - 8 triệu/tháng").
        /// </summary>
        [MaxLength(200)]
        public string? SalaryText { get; set; }

        /// <summary>
        /// Ngân sách tính lương (Escrow) - Số tiền thực trả cho sinh viên.
        /// </summary>
        [Column(TypeName = "decimal(18,0)")]
        public decimal Budget { get; set; } = 0;

        /// <summary>
        /// Phí nền tảng (10% của Budget).
        /// </summary>
        [Column(TypeName = "decimal(18,0)")]
        public decimal Commission { get; set; } = 0;

        public DateTime PostedDate { get; set; } = DateTime.UtcNow;
        public DateTime? Deadline { get; set; }

        public int Views { get; set; } = 0;
        public int ApplicationsCount { get; set; } = 0;

        public bool IsUrgent { get; set; } = false;
        public bool IsRemote { get; set; } = false;

        public JobStatus Status { get; set; } = JobStatus.Open;

        /// <summary>
        /// FK - Sinh viên được giao việc (khi status chuyển sang InProgress).
        /// </summary>
        public string? SelectedStudentId { get; set; }

        [ForeignKey(nameof(SelectedStudentId))]
        public ApplicationUser? SelectedStudent { get; set; }

        // ===== Dispute Fields =====
        public string? DisputeReason { get; set; }
        public string? EmployerEvidenceText { get; set; }
        public string? EmployerEvidenceUrl { get; set; }
        public string? StudentEvidenceText { get; set; }
        public string? StudentEvidenceUrl { get; set; }
        public DateTime? DisputedDate { get; set; }

        // ===== Check-in / Check-out & Escrow Fields =====
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? CheckInOtp { get; set; }
        public DateTime? CheckInOtpExpiredAt { get; set; }
        public string? CheckOutOtp { get; set; }
        public DateTime? CheckOutOtpExpiredAt { get; set; }
        public DateTime? EscrowReleaseDate { get; set; }
        public int RequiredReliabilityScore { get; set; } = 0;

        // ===== Two-way Rating Fields =====
        public int? EmployerToStudentRating { get; set; }
        public string? EmployerToStudentTags { get; set; }
        public string? EmployerToStudentComment { get; set; }
        public int? StudentToEmployerRating { get; set; }
        public string? StudentToEmployerTags { get; set; }
        public string? StudentToEmployerComment { get; set; }

        // ===== Navigation Properties =====
        public ICollection<JobRequirement> Requirements { get; set; } = new List<JobRequirement>();
        public ICollection<JobBenefit> Benefits { get; set; } = new List<JobBenefit>();
        public ICollection<JobTag> Tags { get; set; } = new List<JobTag>();
        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<SavedJob> SavedByUsers { get; set; } = new List<SavedJob>();
    }
}

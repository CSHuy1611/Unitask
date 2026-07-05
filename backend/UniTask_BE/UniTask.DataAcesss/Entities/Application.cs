using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Đơn ứng tuyển - Sinh viên ứng tuyển vào công việc.
    /// Maps from Angular: AuthService.applyToJob(), Job.applicants[].
    /// </summary>
    public class Application
    {
        [Key]
        public int Id { get; set; }

        // FK to Job
        public int JobId { get; set; }

        [ForeignKey(nameof(JobId))]
        public Job Job { get; set; } = null!;

        // FK to StudentProfile
        public int StudentProfileId { get; set; }

        [ForeignKey(nameof(StudentProfileId))]
        public StudentProfile StudentProfile { get; set; } = null!;

        public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;

        public DateTime AppliedDate { get; set; } = DateTime.UtcNow;

        // ===== Check-in / Check-out & Escrow Fields =====
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? CheckInOtp { get; set; }
        public DateTime? CheckInOtpExpiredAt { get; set; }
        public string? CheckOutOtp { get; set; }
        public DateTime? CheckOutOtpExpiredAt { get; set; }
        public DateTime? EscrowReleaseDate { get; set; }

        // ===== Dispute Fields =====
        public string? DisputeReason { get; set; }
        public string? EmployerEvidenceText { get; set; }
        public string? EmployerEvidenceUrl { get; set; }
        public string? StudentEvidenceText { get; set; }
        public string? StudentEvidenceUrl { get; set; }
        public DateTime? DisputedDate { get; set; }
    }
}

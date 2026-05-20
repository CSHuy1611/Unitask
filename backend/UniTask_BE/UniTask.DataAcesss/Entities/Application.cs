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
    }
}

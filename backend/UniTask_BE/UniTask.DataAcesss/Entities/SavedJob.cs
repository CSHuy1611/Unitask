using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Việc đã lưu - Sinh viên bookmark công việc.
    /// Maps from Angular: User.savedJobs (number[]).
    /// </summary>
    public class SavedJob
    {
        [Key]
        public int Id { get; set; }

        // FK to StudentProfile
        public int StudentProfileId { get; set; }

        [ForeignKey(nameof(StudentProfileId))]
        public StudentProfile StudentProfile { get; set; } = null!;

        // FK to Job
        public int JobId { get; set; }

        [ForeignKey(nameof(JobId))]
        public Job Job { get; set; } = null!;

        public DateTime SavedDate { get; set; } = DateTime.UtcNow;
    }
}

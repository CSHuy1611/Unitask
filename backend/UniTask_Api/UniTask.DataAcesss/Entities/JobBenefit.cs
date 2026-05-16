using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Quyền lợi công việc (mỗi dòng là 1 quyền lợi).
    /// Maps from Angular: Job.benefits (string[]).
    /// </summary>
    public class JobBenefit
    {
        [Key]
        public int Id { get; set; }

        // FK to Job
        public int JobId { get; set; }

        [ForeignKey(nameof(JobId))]
        public Job Job { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Content { get; set; } = string.Empty;
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Yêu cầu công việc (mỗi dòng là 1 yêu cầu).
    /// Maps from Angular: Job.requirements (string[]).
    /// </summary>
    public class JobRequirement
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

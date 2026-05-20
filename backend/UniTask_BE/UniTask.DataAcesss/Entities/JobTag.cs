using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Tag / nhãn phân loại công việc.
    /// Maps from Angular: Job.tags (string[]).
    /// </summary>
    public class JobTag
    {
        [Key]
        public int Id { get; set; }

        // FK to Job
        public int JobId { get; set; }

        [ForeignKey(nameof(JobId))]
        public Job Job { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string TagName { get; set; } = string.Empty;
    }
}

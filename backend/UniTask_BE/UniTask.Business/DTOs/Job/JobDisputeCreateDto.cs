using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Job
{
    public class JobDisputeCreateDto
    {
        [Required(ErrorMessage = "Lý do tranh chấp là bắt buộc.")]
        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? EvidenceText { get; set; }

        [MaxLength(500)]
        public string? EvidenceUrl { get; set; }
    }
}

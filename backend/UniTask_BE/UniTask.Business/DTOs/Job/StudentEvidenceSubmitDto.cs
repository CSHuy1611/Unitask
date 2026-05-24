using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Job
{
    public class StudentEvidenceSubmitDto
    {
        [Required(ErrorMessage = "Mô tả bằng chứng hoàn thành là bắt buộc.")]
        [MaxLength(2000)]
        public string EvidenceText { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? EvidenceUrl { get; set; }
    }
}

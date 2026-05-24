using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Admin
{
    public class DisputeResolveDto
    {
        [Required(ErrorMessage = "Bên thắng cuộc (Winner) là bắt buộc.")]
        [RegularExpression("Student|Employer", ErrorMessage = "Winner phải là 'Student' hoặc 'Employer'.")]
        public string Winner { get; set; } = string.Empty;
    }
}

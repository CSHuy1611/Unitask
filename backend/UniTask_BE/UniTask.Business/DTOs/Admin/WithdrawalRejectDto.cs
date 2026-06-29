using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Admin
{
    public class WithdrawalRejectDto
    {
        [Required(ErrorMessage = "Lý do từ chối là bắt buộc.")]
        public string Reason { get; set; } = string.Empty;
    }
}

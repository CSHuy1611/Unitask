using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Payment
{
    public class PaymentCreateRequestDto
    {
        [Required]
        [Range(10000, 100000000, ErrorMessage = "Số tiền nạp tối thiểu là 10,000 VND")]
        public decimal Amount { get; set; }
    }
}

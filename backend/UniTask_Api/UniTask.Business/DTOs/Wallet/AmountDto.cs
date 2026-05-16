using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Wallet
{
    public class AmountDto
    {
        [Required]
        [Range(10000, 100000000, ErrorMessage = "Amount must be between 10,000 and 100,000,000 VND")]
        public decimal Amount { get; set; }
    }
}

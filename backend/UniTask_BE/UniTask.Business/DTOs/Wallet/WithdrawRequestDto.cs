using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Wallet
{
    public class WithdrawRequestDto
    {
        [Required]
        [Range(10000, double.MaxValue, ErrorMessage = "Minimum withdrawal amount is 10,000 VND")]
        public decimal Amount { get; set; }

        [Required]
        public string Bank { get; set; } = string.Empty;

        [Required]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public string AccountName { get; set; } = string.Empty;
    }
}

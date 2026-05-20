namespace UniTask.Business.DTOs.Payment
{
    public class PaymentLinkResponseDto
    {
        public string CheckoutUrl { get; set; } = string.Empty;
        public long OrderCode { get; set; }
    }
}

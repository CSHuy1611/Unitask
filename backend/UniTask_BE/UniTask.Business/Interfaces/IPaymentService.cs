using UniTask.Business.DTOs.Payment;

namespace UniTask.Business.Interfaces
{
    public interface IPaymentService
    {
        Task<PaymentLinkResponseDto> CreatePaymentLinkAsync(string userId, PaymentCreateRequestDto dto, string domain);
        Task<bool> VerifyPaymentWebhookAsync(global::PayOS.Models.Webhooks.Webhook webhookBody);
        Task<bool> VerifyPaymentLocalAsync(long orderCode);
        Task<int> SyncPendingTransactionsAsync(string userId);
    }
}

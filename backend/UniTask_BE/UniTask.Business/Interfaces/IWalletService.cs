using UniTask.Business.DTOs.Wallet;

namespace UniTask.Business.Interfaces
{
    public interface IWalletService
    {
        Task<WalletDto?> GetWalletAsync(string userId);

        Task<bool> WithdrawAsync(string userId, WithdrawRequestDto dto);
        
        Task<bool> QuickTopUpAsync(string userId, decimal amount);
    }
}

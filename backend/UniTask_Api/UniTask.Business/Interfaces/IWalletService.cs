using UniTask.Business.DTOs.Wallet;

namespace UniTask.Business.Interfaces
{
    public interface IWalletService
    {
        Task<WalletDto?> GetWalletAsync(string userId);
        Task<bool> DepositAsync(string userId, decimal amount);
        Task<bool> WithdrawAsync(string userId, WithdrawRequestDto dto);
    }
}

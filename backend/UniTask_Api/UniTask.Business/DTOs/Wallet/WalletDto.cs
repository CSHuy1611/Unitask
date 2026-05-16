using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Wallet
{
    public class TransactionDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public TransactionType Type { get; set; }
        public string TypeName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int? RelatedJobId { get; set; }
        public string? RelatedJobTitle { get; set; }
    }
    
    public class WalletDto
    {
        public decimal Balance { get; set; }
        public List<TransactionDto> RecentTransactions { get; set; } = new();
    }
}

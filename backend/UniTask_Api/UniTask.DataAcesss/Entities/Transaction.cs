using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Lịch sử giao dịch tài chính.
    /// Maps from Angular: AuthService.addBalance(), deductBalance(), payStudent().
    /// </summary>
    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        // FK to Wallet
        public int WalletId { get; set; }

        [ForeignKey(nameof(WalletId))]
        public Wallet Wallet { get; set; } = null!;

        [Column(TypeName = "decimal(18,0)")]
        public decimal Amount { get; set; }

        public TransactionType Type { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// FK tùy chọn - Liên kết giao dịch với một Job cụ thể (cho Escrow).
        /// </summary>
        public int? RelatedJobId { get; set; }

        [ForeignKey(nameof(RelatedJobId))]
        public Job? RelatedJob { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

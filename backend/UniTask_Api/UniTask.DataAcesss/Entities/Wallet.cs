using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Ví tiền người dùng - Quản lý số dư tài khoản.
    /// Maps from Angular: User.balance.
    /// </summary>
    public class Wallet
    {
        [Key]
        public int Id { get; set; }

        // FK to ApplicationUser (1-1)
        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey(nameof(UserId))]
        public ApplicationUser User { get; set; } = null!;

        [Column(TypeName = "decimal(18,0)")]
        public decimal Balance { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ===== Navigation Properties =====
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}

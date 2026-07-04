using System;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Admin
{
    public class TransactionDto
    {
        public int Id { get; set; }
        public int WalletId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public TransactionType Type { get; set; }
        public string TypeName => Type.ToString();
        public string? Description { get; set; }
        public int? RelatedJobId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

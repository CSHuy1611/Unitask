namespace UniTask.DataAcesss.Entities.Enums
{
    public enum TransactionType
    {
        Deposit = 0,        // Nạp tiền
        PostingFee = 1,     // Phí đăng tin
        EscrowHold = 2,     // Tạm giữ tiền (Escrow)
        EscrowRelease = 3,  // Giải phóng tiền cho sinh viên
        CommissionFee = 4,  // Phí nền tảng 10%
        Refund = 5,         // Hoàn tiền
        Withdrawal = 6,     // Rút tiền
        SubscriptionFee = 7 // Phí mua gói dịch vụ
    }
}

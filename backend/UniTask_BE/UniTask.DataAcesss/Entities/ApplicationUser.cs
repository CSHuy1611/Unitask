using Microsoft.AspNetCore.Identity;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss.Entities
{
    /// <summary>
    /// Thực thể người dùng chính, kế thừa IdentityUser để tích hợp ASP.NET Core Identity.
    /// Bao gồm thông tin chung cho cả Student, Employer và Admin.
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// URL ảnh đại diện lưu trên Cloudinary.
        /// </summary>
        public string? AvatarUrl { get; set; }

        public UserType UserType { get; set; }

        // ===== eKYC =====
        public EkycStatus EkycStatus { get; set; } = EkycStatus.None;
        public DateTime? EkycDate { get; set; }

        /// <summary>
        /// Cloudinary URL - Ảnh mặt trước CCCD.
        /// </summary>
        public string? EkycFrontImageUrl { get; set; }

        /// <summary>
        /// Cloudinary URL - Ảnh mặt sau CCCD.
        /// </summary>
        public string? EkycBackImageUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int BlacklistCount { get; set; } = 0;

        // ===== Navigation Properties =====
        public StudentProfile? StudentProfile { get; set; }
        public EmployerProfile? EmployerProfile { get; set; }
        public Wallet? Wallet { get; set; }
    }
}

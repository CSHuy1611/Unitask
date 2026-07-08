using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Auth
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Full Name is required")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required (Student or Employer)")]
        public string Role { get; set; } = string.Empty;
        
        [RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.")]
        public string? PhoneNumber { get; set; }

        // Optional Student Fields
        public string? University { get; set; }
        public string? Major { get; set; }
        public int? Year { get; set; }

        // Optional Employer Fields
        public string? CompanyName { get; set; }
        public string? Position { get; set; }

        /// <summary>
        /// Mã số thuế doanh nghiệp - Có thể bỏ trống khi đăng ký, sẽ cập nhật sau trong Hồ sơ.
        /// </summary>
        public string? TaxCode { get; set; }

        /// <summary>
        /// URL giấy phép kinh doanh (Cloudinary URL) - Cần upload trước khi gọI API register.
        /// </summary>
        public string? BusinessLicenseUrl { get; set; }
    }
}

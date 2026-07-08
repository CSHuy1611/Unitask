using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Profile
{
    public class UpgradeToBusinessDto
    {
        [Required(ErrorMessage = "Mã số thuế là bắt buộc")]
        public string TaxCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giấy phép kinh doanh là bắt buộc")]
        public IFormFile BusinessLicenseFile { get; set; } = null!;
        
        [Required(ErrorMessage = "Tên công ty là bắt buộc")]
        public string CompanyName { get; set; } = string.Empty;
    }
}

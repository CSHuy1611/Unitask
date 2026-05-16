using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Admin
{
    public class ServicePackageUpdateDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int DurationMonths { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        public bool IsActive { get; set; }
    }
}

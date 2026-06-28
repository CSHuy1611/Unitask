using System.ComponentModel.DataAnnotations;

namespace UniTask.Business.DTOs.Job
{
    public class JobCreateDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        [Required]
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        [Required]
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Salary { get; set; } = string.Empty;
        public string SalaryText { get; set; } = string.Empty;
        public List<decimal> SalaryRange { get; set; } = new();
        public decimal Budget { get; set; }
        public decimal Commission { get; set; }
        public DateTime? Deadline { get; set; }
        public bool IsUrgent { get; set; }
        public bool IsRemote { get; set; }
        public int RequiredReliabilityScore { get; set; } = 0;

        public List<string> Tags { get; set; } = new();
        public List<string> Requirements { get; set; } = new();
        public List<string> Benefits { get; set; } = new();
    }

    public class JobUpdateDto : JobCreateDto
    {
    }
}

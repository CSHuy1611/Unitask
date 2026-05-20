using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Job
{
    public class JobDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? SalaryText { get; set; }
        public List<decimal> SalaryRange { get; set; } = new();
        public decimal Budget { get; set; }
        public decimal Commission { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? Deadline { get; set; }
        public int Views { get; set; }
        public int ApplicationsCount { get; set; }
        public bool IsUrgent { get; set; }
        public bool IsRemote { get; set; }
        public JobStatus Status { get; set; }

        public string EmployerId { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public string? CompanyLogoUrl { get; set; }
        public string? CompanyDescription { get; set; }
        public string? CompanyIndustry { get; set; }
        public string? CompanySize { get; set; }
        public string? CompanyLocation { get; set; }
        public string? CompanyWebsite { get; set; }

        public List<string> Tags { get; set; } = new();
        public List<string> Requirements { get; set; } = new();
        public List<string> Benefits { get; set; } = new();
    }
}

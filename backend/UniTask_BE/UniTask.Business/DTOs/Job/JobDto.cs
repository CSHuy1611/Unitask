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
        public string Category { get; set; } = string.Empty;
        public string? Salary { get; set; }
        public string? SalaryText { get; set; }
        public List<decimal> SalaryRange { get; set; } = new();
        public decimal Budget { get; set; }
        public decimal Commission { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? Deadline { get; set; }
        public int Views { get; set; }
        public int ApplicationsCount { get; set; }
        public int AcceptedCount { get; set; }
        public bool IsUrgent { get; set; }
        public bool IsRemote { get; set; }
        public JobStatus Status { get; set; }
        public int HeadCount { get; set; } = 1;

        // ===== Dispute Fields =====
        public string? DisputeReason { get; set; }
        public string? EmployerEvidenceText { get; set; }
        public string? EmployerEvidenceUrl { get; set; }
        public string? StudentEvidenceText { get; set; }
        public string? StudentEvidenceUrl { get; set; }
        public DateTime? DisputedDate { get; set; }

        public int RequiredReliabilityScore { get; set; }

        // ===== Two-way Rating Fields =====
        public int? EmployerToStudentRating { get; set; }
        public string? EmployerToStudentTags { get; set; }
        public string? EmployerToStudentComment { get; set; }
        public int? StudentToEmployerRating { get; set; }
        public string? StudentToEmployerTags { get; set; }
        public string? StudentToEmployerComment { get; set; }

        public string EmployerId { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public string? CompanyLogoUrl { get; set; }
        public string? CompanyDescription { get; set; }
        public string? CompanyIndustry { get; set; }
        public string? CompanySize { get; set; }
        public string? CompanyLocation { get; set; }
        public string? CompanyWebsite { get; set; }
        public bool IsCompanyPremium { get; set; }

        public List<string> Tags { get; set; } = new();
        public List<string> Requirements { get; set; } = new();
        public List<string> Benefits { get; set; } = new();
    }
}

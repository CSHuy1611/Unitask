using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.DTOs.Application
{
    public class ApplicationDto
    {
        public int Id { get; set; }
        public int JobId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? StudentEmail { get; set; }
        public string? StudentPhone { get; set; }
        public string? StudentAvatarUrl { get; set; }
        
        // Extended Student Profile details for Employer Review UI
        public string? StudentUniversity { get; set; }
        public string? StudentMajor { get; set; }
        public int? StudentYear { get; set; }
        public string? StudentBio { get; set; }
        public string? StudentEkycStatus { get; set; }
        public List<string> StudentSkills { get; set; } = new();
        public string? StudentCVUrl { get; set; }
        public decimal? StudentGpa { get; set; }
        public int StudentReliabilityScore { get; set; }

        public ApplicationStatus Status { get; set; }
        public string? RejectReason { get; set; }
        public DateTime AppliedDate { get; set; }

        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        
        public string? DisputeReason { get; set; }
        public string? EmployerEvidenceText { get; set; }
        public string? EmployerEvidenceUrl { get; set; }
        public string? StudentEvidenceText { get; set; }
        public string? StudentEvidenceUrl { get; set; }
        public DateTime? DisputedDate { get; set; }
    }
}

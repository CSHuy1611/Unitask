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
        public string? StudentAvatarUrl { get; set; }
        
        public ApplicationStatus Status { get; set; }
        public DateTime AppliedDate { get; set; }
    }
}

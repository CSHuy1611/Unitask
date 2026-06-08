namespace UniTask.Business.DTOs.Job
{
    public class JobFilterDto
    {
        public string? SearchTerm { get; set; }
        public string? Location { get; set; }
        public string? Type { get; set; } // e.g., "Freelance", "Part-time"
        public bool? IsRemote { get; set; }
        public bool? IsUrgent { get; set; }
        public List<string>? Tags { get; set; }
        public string? StudentId { get; set; }
        
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}

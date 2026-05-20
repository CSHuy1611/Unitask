namespace UniTask.Business.DTOs.Admin
{
    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalEmployers { get; set; }
        public int TotalJobs { get; set; }
        public decimal TotalRevenue { get; set; }
        public int EkycPending { get; set; }
        public int EkycVerified { get; set; }
        public int ApplicationsThisMonth { get; set; }
    }
}

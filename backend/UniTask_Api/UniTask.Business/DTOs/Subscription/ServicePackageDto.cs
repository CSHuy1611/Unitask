namespace UniTask.Business.DTOs.Subscription
{
    public class ServicePackageDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int DurationMonths { get; set; }
        public string? Description { get; set; }
    }
}

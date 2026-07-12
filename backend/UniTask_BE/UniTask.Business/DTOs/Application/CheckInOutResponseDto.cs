namespace UniTask.Business.DTOs.Application
{
    public class CheckInOutResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public string StatusText { get; set; } = "";
        public string ReliabilityChangeText { get; set; } = "";
    }
}

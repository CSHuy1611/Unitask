namespace UniTask.Business.DTOs.Auth
{
    public class AuthResponse
    {
        public bool IsSuccess { get; set; }
        public string? Token { get; set; }
        public string? Message { get; set; }
        
        // User basic info
        public string? UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Role { get; set; }
        public string? AvatarUrl { get; set; }
        
        // Profiles IDs if needed by frontend
        public int? StudentProfileId { get; set; }
        public int? EmployerProfileId { get; set; }
    }
}

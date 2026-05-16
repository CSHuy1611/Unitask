using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Auth;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;
using Microsoft.AspNetCore.SignalR;
using UniTask.Business.Hubs;

namespace UniTask.Business.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly IHubContext<DashboardHub> _hubContext;

        public AuthService(UserManager<ApplicationUser> userManager, AppDbContext context, ITokenService tokenService, IHubContext<DashboardHub> hubContext)
        {
            _userManager = userManager;
            _context = context;
            _tokenService = tokenService;
            _hubContext = hubContext;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return new AuthResponse { IsSuccess = false, Message = "Invalid email or password." };
            }

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
            {
                return new AuthResponse { IsSuccess = false, Message = "Invalid email or password." };
            }

            var roles = await _userManager.GetRolesAsync(user);
            var token = _tokenService.GenerateToken(user, roles);

            // Fetch profile IDs based on role
            int? studentProfileId = null;
            int? employerProfileId = null;

            if (user.UserType == UserType.Student)
            {
                var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
                studentProfileId = profile?.Id;
            }
            else if (user.UserType == UserType.Employer)
            {
                var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
                employerProfileId = profile?.Id;
            }

            return new AuthResponse
            {
                IsSuccess = true,
                Message = "Login successful",
                Token = token,
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                Role = roles.FirstOrDefault(),
                StudentProfileId = studentProfileId,
                EmployerProfileId = employerProfileId
            };
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            // Validations
            if (request.Role != "Student" && request.Role != "Employer")
            {
                return new AuthResponse { IsSuccess = false, Message = "Invalid role. Must be 'Student' or 'Employer'." };
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return new AuthResponse { IsSuccess = false, Message = "Email is already registered." };
            }

            var userType = request.Role == "Student" ? UserType.Student : UserType.Employer;

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FullName = request.FullName,
                PhoneNumber = request.PhoneNumber,
                UserType = userType,
                CreatedAt = DateTime.UtcNow,
                EkycStatus = EkycStatus.None
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return new AuthResponse 
                { 
                    IsSuccess = false, 
                    Message = string.Join(", ", result.Errors.Select(e => e.Description)) 
                };
            }

            // Assign Role
            await _userManager.AddToRoleAsync(user, request.Role);

            // Create Wallet
            _context.Wallets.Add(new Wallet { UserId = user.Id, Balance = 0 });

            // Create appropriate Profile
            int? studentProfileId = null;
            int? employerProfileId = null;

            if (userType == UserType.Student)
            {
                var studentProfile = new StudentProfile { UserId = user.Id };
                _context.StudentProfiles.Add(studentProfile);
                await _context.SaveChangesAsync(); // save to get ID
                studentProfileId = studentProfile.Id;
            }
            else
            {
                var employerProfile = new EmployerProfile { UserId = user.Id };
                _context.EmployerProfiles.Add(employerProfile);
                await _context.SaveChangesAsync(); // save to get ID
                employerProfileId = employerProfile.Id;
            }
            
            // Generate token for auto-login
            var roles = new List<string> { request.Role };
            var token = _tokenService.GenerateToken(user, roles);

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("UserRegistered");

            return new AuthResponse
            {
                IsSuccess = true,
                Message = "Registration successful",
                Token = token,
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = request.Role,
                StudentProfileId = studentProfileId,
                EmployerProfileId = employerProfileId
            };
        }
    }
}

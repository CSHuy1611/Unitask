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
        private readonly IEmailService _emailService;

        public AuthService(UserManager<ApplicationUser> userManager, AppDbContext context, ITokenService tokenService, IHubContext<DashboardHub> hubContext, IEmailService emailService)
        {
            _userManager = userManager;
            _context = context;
            _tokenService = tokenService;
            _hubContext = hubContext;
            _emailService = emailService;
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

            // ===== Employer-specific validations =====
            if (request.Role == "Employer")
            {
                if (string.IsNullOrWhiteSpace(request.CompanyName))
                {
                    return new AuthResponse { IsSuccess = false, Message = "Tên công ty là bắt buộc khi đăng ký tài khoản Doanh nghiệp." };
                }

                if (string.IsNullOrWhiteSpace(request.TaxCode))
                {
                    return new AuthResponse { IsSuccess = false, Message = "Mã số thuế là bắt buộc khi đăng ký tài khoản Doanh nghiệp." };
                }

                // Validate Vietnamese Tax Code format: 10 or 13 digits
                if (!System.Text.RegularExpressions.Regex.IsMatch(request.TaxCode.Trim(), @"^\d{10}(\d{3})?$"))
                {
                    return new AuthResponse { IsSuccess = false, Message = "Mã số thuế không đúng định dạng. Phải gồm 10 hoặc 13 chữ số." };
                }

                // Check TaxCode uniqueness
                var taxCodeExists = await _context.Companies
                    .AnyAsync(c => c.TaxCode == request.TaxCode.Trim());
                if (taxCodeExists)
                {
                    return new AuthResponse { IsSuccess = false, Message = "Mã số thuế này đã được đăng ký trước đó trong hệ thống. Vui lòng kiểm tra lại." };
                }
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            ApplicationUser user = existingUser;
            bool isNewUser = false;
            string otpCode = new Random().Next(100000, 999999).ToString();
            DateTime otpExpiry = DateTime.UtcNow.AddMinutes(10);

            if (existingUser != null)
            {
                if (existingUser.EmailConfirmed)
                {
                    return new AuthResponse { IsSuccess = false, Message = "Email is already registered." };
                }
                
                // Reuse unconfirmed ghost account
                user.FullName = request.FullName;
                user.PhoneNumber = request.PhoneNumber;
                user.OtpCode = otpCode;
                user.OtpExpiryTime = otpExpiry;
                
                // Update password
                var tokenReset = await _userManager.GeneratePasswordResetTokenAsync(user);
                await _userManager.ResetPasswordAsync(user, tokenReset, request.Password);
                
                await _userManager.UpdateAsync(user);
            }
            else
            {
                isNewUser = true;
                var userType = request.Role == "Student" ? UserType.Student : UserType.Employer;
                user = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    FullName = request.FullName,
                    PhoneNumber = request.PhoneNumber,
                    UserType = userType,
                    CreatedAt = DateTime.UtcNow,
                    EkycStatus = EkycStatus.None,
                    EmailConfirmed = false,
                    OtpCode = otpCode,
                    OtpExpiryTime = otpExpiry
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
                if (userType == UserType.Student)
                {
                    var studentProfile = new StudentProfile 
                    { 
                        UserId = user.Id,
                        University = request.University,
                        Major = request.Major,
                        Year = request.Year
                    };
                    _context.StudentProfiles.Add(studentProfile);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    var employerProfile = new EmployerProfile 
                    { 
                        UserId = user.Id,
                        Position = request.Position,
                        BusinessLicenseUrl = request.BusinessLicenseUrl,
                        // License is pending admin review; not verified yet
                        IsBusinessLicenseVerified = false
                    };

                    if (!string.IsNullOrEmpty(request.CompanyName))
                    {
                        var company = new Company 
                        { 
                            Name = request.CompanyName,
                            TaxCode = request.TaxCode?.Trim(),
                            CreatedAt = DateTime.UtcNow 
                        };
                        _context.Companies.Add(company);
                        await _context.SaveChangesAsync();
                        employerProfile.CompanyId = company.Id;
                    }

                    _context.EmployerProfiles.Add(employerProfile);
                    await _context.SaveChangesAsync();
                }
            }

            // Send OTP Email
            try
            {
                string emailBody = $@"
                    <div style='font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;'>
                        <div style='max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px;'>
                            <h2 style='color: #4F46E5; text-align: center;'>UniTask</h2>
                            <p>Xin chào {request.FullName},</p>
                            <p>Cảm ơn bạn đã đăng ký tài khoản UniTask. Vui lòng sử dụng mã OTP dưới đây để xác thực email của bạn:</p>
                            <div style='text-align: center; margin: 30px 0;'>
                                <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; padding: 10px 20px; background: #EEF2FF; border-radius: 8px;'>{otpCode}</span>
                            </div>
                            <p style='color: #666; font-size: 14px;'>Mã này sẽ hết hạn trong 10 phút. Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.</p>
                        </div>
                    </div>";
                await _emailService.SendEmailAsync(user.Email, "Mã xác nhận đăng ký UniTask", emailBody);
            }
            catch (Exception ex)
            {
                // If this was a brand new user but email failed, we keep the user as EmailConfirmed = false.
                // Next time they register, it will overwrite and retry.
                return new AuthResponse { IsSuccess = false, Message = "Không thể gửi mã xác nhận. Vui lòng kiểm tra lại địa chỉ Email." };
            }

            return new AuthResponse
            {
                IsSuccess = true,
                Message = "Vui lòng kiểm tra email để lấy mã OTP.",
                Token = "" // No token until verified
            };
        }

        public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return new AuthResponse { IsSuccess = false, Message = "Email không tồn tại." };
            }

            if (user.EmailConfirmed)
            {
                return new AuthResponse { IsSuccess = false, Message = "Tài khoản đã được xác thực." };
            }

            if (user.OtpCode != request.OtpCode)
            {
                return new AuthResponse { IsSuccess = false, Message = "Mã OTP không chính xác." };
            }

            if (user.OtpExpiryTime == null || user.OtpExpiryTime < DateTime.UtcNow)
            {
                return new AuthResponse { IsSuccess = false, Message = "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã." };
            }

            user.EmailConfirmed = true;
            user.OtpCode = null;
            user.OtpExpiryTime = null;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return new AuthResponse { IsSuccess = false, Message = "Lỗi khi cập nhật trạng thái tài khoản." };
            }

            // Broadcast real-time event to Admin Dashboard
            await _hubContext.Clients.All.SendAsync("UserRegistered");

            return new AuthResponse { IsSuccess = true, Message = "Xác thực email thành công." };
        }
    }
}

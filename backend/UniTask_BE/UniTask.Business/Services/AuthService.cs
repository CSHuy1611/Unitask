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

            bool isAiApproved = false;

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

                var taxCode = request.TaxCode.Trim();
                // Validate Vietnamese Tax Code format: 10 or 13 digits
                if (!System.Text.RegularExpressions.Regex.IsMatch(taxCode, @"^\d{10}(\d{3})?$"))
                {
                    return new AuthResponse { IsSuccess = false, Message = "Mã số thuế không đúng định dạng. Phải gồm 10 hoặc 13 chữ số." };
                }

                // Check TaxCode uniqueness
                var existingUserByTax = await _context.EmployerProfiles
                    .Include(ep => ep.Company)
                    .Include(ep => ep.User)
                    .FirstOrDefaultAsync(ep => ep.Company != null && ep.Company.TaxCode == taxCode);

                if (existingUserByTax != null)
                {
                    // If the existing user is exactly the one trying to register (Email match) AND they are unconfirmed, we allow it to pass!
                    if (existingUserByTax.User.Email == request.Email && !existingUserByTax.User.EmailConfirmed)
                    {
                        // Allow resend OTP
                    }
                    else
                    {
                        return new AuthResponse { IsSuccess = false, Message = "Mã số thuế này đã được đăng ký trước đó trong hệ thống. Vui lòng kiểm tra lại." };
                    }
                }

                // LẦN KIỂM TRA MỨC ĐỘ 3: EXTERNAL API (VietQR)
                try
                {
                    using var client = new HttpClient();
                    // Set timeout to avoid hanging the registration process
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var response = await client.GetAsync($"https://api.vietqr.io/v2/business/{taxCode}");
                    
                    var content = await response.Content.ReadAsStringAsync();
                    using var json = System.Text.Json.JsonDocument.Parse(content);
                    if (json.RootElement.TryGetProperty("code", out var codeElement))
                    {
                        var code = codeElement.GetString();
                        if (code != "00")
                        {
                            var desc = json.RootElement.TryGetProperty("desc", out var descElem) ? descElem.GetString() : "Không xác định";
                            return new AuthResponse { IsSuccess = false, Message = $"Mã số thuế không hợp lệ hoặc không tồn tại (Hệ thống Thuế Quốc gia báo: {desc})." };
                        }
                        
                        if (json.RootElement.TryGetProperty("data", out var dataElement) && dataElement.ValueKind != System.Text.Json.JsonValueKind.Null)
                        {
                            if (dataElement.TryGetProperty("status", out var statusElement))
                            {
                                var status = statusElement.GetString();
                                if (status != null && (status.ToLower().Contains("ngừng") || status.ToLower().Contains("đóng") || status.ToLower().Contains("tạm nghỉ")))
                                {
                                    return new AuthResponse { IsSuccess = false, Message = $"Mã số thuế này không thể đăng ký vì tình trạng hiện tại là: {status}." };
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[TaxCode Verification API] Error: {ex.Message}");
                    // Nếu API lỗi (timeout/sập), cho phép đăng ký qua Cấp 1+2 (Fallback thủ công bằng ảnh Giấy phép KD sau).
                }

                // LẦN KIỂM TRA MỨC ĐỘ 4: AI/OCR (Đọc ảnh giấy phép kinh doanh)
                if (!string.IsNullOrWhiteSpace(request.BusinessLicenseUrl))
                {
                    try
                    {
                        using var ocrClient = new HttpClient();
                        ocrClient.Timeout = TimeSpan.FromSeconds(15);
                        var ocrUrl = $"https://api.ocr.space/parse/imageurl?apikey=helloworld&url={Uri.EscapeDataString(request.BusinessLicenseUrl)}";
                        var ocrResponse = await ocrClient.GetAsync(ocrUrl);
                        
                        if (ocrResponse.IsSuccessStatusCode)
                        {
                            var ocrContent = await ocrResponse.Content.ReadAsStringAsync();
                            using var ocrJson = System.Text.Json.JsonDocument.Parse(ocrContent);
                            var ocrExitCode = ocrJson.RootElement.GetProperty("OCRExitCode").GetInt32();
                            
                            // OCR.space returns ExitCode 1 or 2 for success
                            if (ocrExitCode == 1 || ocrExitCode == 2)
                            {
                                var parsedResults = ocrJson.RootElement.GetProperty("ParsedResults");
                                if (parsedResults.GetArrayLength() > 0)
                                {
                                    var parsedText = parsedResults[0].GetProperty("ParsedText").GetString();
                                    if (parsedText != null)
                                    {
                                        // Clean text from spaces, dashes, dots to find exact Tax Code match
                                        var cleanText = parsedText.Replace(" ", "").Replace("-", "").Replace(".", "").Replace("\n", "").Replace("\r", "");
                                        if (cleanText.Contains(taxCode))
                                        {
                                            isAiApproved = true;
                                            System.Console.WriteLine($"[AI/OCR] Match Found! Auto-approving {taxCode}");
                                        }
                                        else
                                        {
                                            return new AuthResponse { IsSuccess = false, Message = "Hệ thống AI không tìm thấy Mã số thuế trên ảnh Giấy phép kinh doanh. Vui lòng tải lên ảnh rõ nét hoặc đúng giấy phép của doanh nghiệp bạn nhập." };
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Console.WriteLine($"[AI/OCR Verification] Error: {ex.Message}");
                        // Continue registration even if OCR fails
                    }
                }
            }
            // Check Phone uniqueness
            if (!string.IsNullOrEmpty(request.PhoneNumber))
            {
                var phoneExists = await _userManager.Users
                    .AnyAsync(u => u.PhoneNumber == request.PhoneNumber && u.EmailConfirmed);
                
                if (phoneExists)
                {
                    return new AuthResponse { IsSuccess = false, Message = "Số điện thoại này đã được sử dụng cho một tài khoản khác." };
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
                    return new AuthResponse { IsSuccess = false, Message = "Email này đã được đăng ký trong hệ thống." };
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

                // Update Profile and Company for ghost account
                if (request.Role == "Employer")
                {
                    var employerProfile = await _context.EmployerProfiles
                        .Include(p => p.Company)
                        .FirstOrDefaultAsync(p => p.UserId == user.Id);
                        
                    if (employerProfile != null)
                    {
                        employerProfile.Position = request.Position;
                        employerProfile.BusinessLicenseUrl = request.BusinessLicenseUrl;
                        employerProfile.IsBusinessLicenseVerified = isAiApproved;

                        if (employerProfile.Company != null)
                        {
                            employerProfile.Company.Name = request.CompanyName;
                            employerProfile.Company.TaxCode = request.TaxCode?.Trim();
                        }
                        else if (!string.IsNullOrEmpty(request.CompanyName))
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
                        
                        await _context.SaveChangesAsync();
                    }
                }
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
                        // AI Approval flag
                        IsBusinessLicenseVerified = isAiApproved
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

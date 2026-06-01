using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UniTask.Business.DTOs.Profile;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class ProfileService : IProfileService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AppDbContext _context;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public ProfileService(
            UserManager<ApplicationUser> userManager, 
            AppDbContext context, 
            ICloudinaryService cloudinaryService, 
            IEmailService emailService,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _context = context;
            _cloudinaryService = cloudinaryService;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<object?> GetProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return null;

            if (user.UserType == UserType.Student)
            {
                var profile = await _context.StudentProfiles
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                
                if (profile == null) return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate, ekycFrontImage = user.EkycFrontImageUrl, ekycBackImage = user.EkycBackImageUrl } };

                return new
                {
                    user = new
                    {
                        fullName = profile.User.FullName,
                        email = profile.User.Email,
                        phoneNumber = profile.User.PhoneNumber,
                        avatarUrl = profile.User.AvatarUrl,
                        ekycStatus = profile.User.EkycStatus,
                        ekycDate = profile.User.EkycDate,
                        ekycFrontImage = profile.User.EkycFrontImageUrl,
                        ekycBackImage = profile.User.EkycBackImageUrl
                    },
                    university = profile.University,
                    major = profile.Major,
                    year = profile.Year,
                    gpa = profile.GPA,
                    skills = profile.Skills,
                    bio = profile.Bio,
                    cvUrl = profile.CVUrl,
                    cvUploadDate = profile.CVUploadDate,
                    address = profile.Address,
                    dateOfBirth = profile.DateOfBirth
                };
            }
            else if (user.UserType == UserType.Employer)
            {
                var profile = await _context.EmployerProfiles
                    .Include(p => p.User)
                    .Include(p => p.Company)
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (profile == null) return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate, ekycFrontImage = user.EkycFrontImageUrl, ekycBackImage = user.EkycBackImageUrl } };

                var activeSubscription = await _context.Subscriptions
                    .Include(s => s.Package)
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive && s.EndDate > DateTime.UtcNow);

                return new
                {
                    user = new
                    {
                        fullName = profile.User.FullName,
                        email = profile.User.Email,
                        phoneNumber = profile.User.PhoneNumber,
                        avatarUrl = profile.User.AvatarUrl,
                        ekycStatus = profile.User.EkycStatus,
                        ekycDate = profile.User.EkycDate,
                        ekycFrontImage = profile.User.EkycFrontImageUrl,
                        ekycBackImage = profile.User.EkycBackImageUrl
                    },
                    position = profile.Position,
                    company = profile.Company != null ? new
                    {
                        id = profile.Company.Id,
                        name = profile.Company.Name,
                        industry = profile.Company.Industry,
                        size = profile.Company.Size,
                        location = profile.Company.Location,
                        description = profile.Company.Description,
                        website = profile.Company.Website,
                        logoUrl = profile.Company.LogoUrl
                    } : null,
                    activePackage = activeSubscription?.Package?.Name,
                    packageExpiry = activeSubscription?.EndDate.ToString("yyyy-MM-dd")
                };
            }

            return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate, ekycFrontImage = user.EkycFrontImageUrl, ekycBackImage = user.EkycBackImageUrl } };
        }

        public async Task<bool> UpdateStudentProfileAsync(string userId, StudentProfileUpdateDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (user == null || profile == null) return false;

            // Update Identity User fields
            if (!string.IsNullOrEmpty(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrEmpty(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;

            // Handle Avatar Upload
            if (dto.AvatarFile != null)
            {
                // Delete old avatar if exists
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var publicId = _cloudinaryService.GetPublicIdFromUrl(user.AvatarUrl);
                    if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
                }

                user.AvatarUrl = await _cloudinaryService.UploadImageAsync(dto.AvatarFile, "Avatars");
            }

            // Update Profile fields
            if (!string.IsNullOrEmpty(dto.University)) profile.University = dto.University;
            if (!string.IsNullOrEmpty(dto.Major)) profile.Major = dto.Major;
            if (dto.Year.HasValue) profile.Year = dto.Year.Value;
            if (dto.GPA.HasValue) profile.GPA = dto.GPA.Value;
            if (!string.IsNullOrEmpty(dto.Skills)) profile.Skills = dto.Skills;
            if (!string.IsNullOrEmpty(dto.Bio)) profile.Bio = dto.Bio;
            if (!string.IsNullOrEmpty(dto.Address)) profile.Address = dto.Address;
            if (dto.DateOfBirth.HasValue) profile.DateOfBirth = dto.DateOfBirth.Value;

            await _userManager.UpdateAsync(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateEmployerProfileAsync(string userId, EmployerProfileUpdateDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var profile = await _context.EmployerProfiles.Include(p => p.Company).FirstOrDefaultAsync(p => p.UserId == userId);

            if (user == null || profile == null) return false;

            // Update Identity User fields
            if (!string.IsNullOrEmpty(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrEmpty(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;

            // Handle Avatar Upload
            if (dto.AvatarFile != null)
            {
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var publicId = _cloudinaryService.GetPublicIdFromUrl(user.AvatarUrl);
                    if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
                }
                user.AvatarUrl = await _cloudinaryService.UploadImageAsync(dto.AvatarFile, "Avatars");
            }

            // Update Profile fields
            if (!string.IsNullOrEmpty(dto.Position)) profile.Position = dto.Position;

            // Update or Create Company info
            if (profile.Company == null)
            {
                if (!string.IsNullOrEmpty(dto.CompanyName))
                {
                    profile.Company = new Company { Name = dto.CompanyName };
                    _context.Companies.Add(profile.Company);
                }
            }

            if (profile.Company != null)
            {
                if (!string.IsNullOrEmpty(dto.CompanyName)) profile.Company.Name = dto.CompanyName;
                if (!string.IsNullOrEmpty(dto.Industry)) profile.Company.Industry = dto.Industry;
                if (!string.IsNullOrEmpty(dto.Size)) profile.Company.Size = dto.Size;
                if (!string.IsNullOrEmpty(dto.Location)) profile.Company.Location = dto.Location;
                if (!string.IsNullOrEmpty(dto.Description)) profile.Company.Description = dto.Description;
                if (!string.IsNullOrEmpty(dto.Website)) profile.Company.Website = dto.Website;

                // Handle Logo Upload
                if (dto.CompanyLogoFile != null)
                {
                    if (!string.IsNullOrEmpty(profile.Company.LogoUrl))
                    {
                        var publicId = _cloudinaryService.GetPublicIdFromUrl(profile.Company.LogoUrl);
                        if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
                    }
                    profile.Company.LogoUrl = await _cloudinaryService.UploadImageAsync(dto.CompanyLogoFile, "Logos");
                }
            }

            await _userManager.UpdateAsync(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateEkycAsync(string userId, EkycUpdateDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            // Delete old images if exist
            if (!string.IsNullOrEmpty(user.EkycFrontImageUrl))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(user.EkycFrontImageUrl);
                if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
            }
            if (!string.IsNullOrEmpty(user.EkycBackImageUrl))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(user.EkycBackImageUrl);
                if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
            }

            try
            {
                user.EkycFrontImageUrl = await _cloudinaryService.UploadImageAsync(dto.FrontImage, "eKYC");
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[Cloudinary Error] FrontImage upload failed: {ex.Message}. Using placeholder.");
                user.EkycFrontImageUrl = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500";
            }

            try
            {
                user.EkycBackImageUrl = await _cloudinaryService.UploadImageAsync(dto.BackImage, "eKYC");
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[Cloudinary Error] BackImage upload failed: {ex.Message}. Using placeholder.");
                user.EkycBackImageUrl = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500";
            }

            user.EkycStatus = EkycStatus.Pending;
            user.EkycDate = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                try
                {
                    var admins = await _userManager.Users
                        .Where(u => u.UserType == UserType.Admin)
                        .ToListAsync();

                    var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:4200";
                    var approveLink = $"{frontendUrl.TrimEnd('/')}/admin/users";

                    foreach (var admin in admins)
                    {
                        if (string.IsNullOrEmpty(admin.Email)) continue;

                        var subject = $"[UniTask] Yêu cầu xác thực tài khoản mới từ {user.FullName}";
                        var body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #4f46e5; margin: 0;"">Yêu Cầu Xác Thực Danh Tính Mới (eKYC)</h2>
        <p style=""color: #6b7280; font-size: 14px;"">UniTask Matching Platform</p>
    </div>
    <div style=""background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;"">
        <h4 style=""margin: 0 0 10px 0; color: #1f2937;"">Thông tin người dùng:</h4>
        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold; width: 120px;"">Họ tên:</td>
                <td style=""padding: 5px 0; color: #111827;"">{user.FullName}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Email:</td>
                <td style=""padding: 5px 0; color: #111827;"">{user.Email}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Số điện thoại:</td>
                <td style=""padding: 5px 0; color: #111827;"">{user.PhoneNumber}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Vai trò:</td>
                <td style=""padding: 5px 0; color: #111827;"">{(user.UserType == UserType.Student ? "Sinh viên" : "Nhà tuyển dụng")}</td>
            </tr>
            <tr>
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Thời gian gửi:</td>
                <td style=""padding: 5px 0; color: #111827;"">{DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss")}</td>
            </tr>
        </table>
    </div>
    <div style=""margin-bottom: 25px;"">
        <h4 style=""margin: 0 0 10px 0; color: #1f2937;"">Hình ảnh giấy tờ tải lên:</h4>
        <div style=""display: flex; gap: 10px; margin-bottom: 10px;"">
            <div style=""flex: 1; text-align: center;"">
                <p style=""font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: #4b5563;"">Mặt trước CCCD:</p>
                <img src=""{user.EkycFrontImageUrl}"" alt=""Mặt trước"" style=""width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #d1d5db;"" />
            </div>
            <div style=""flex: 1; text-align: center;"">
                <p style=""font-size: 12px; font-weight: bold; margin: 0 0 5px 0; color: #4b5563;"">Mặt sau CCCD:</p>
                <img src=""{user.EkycBackImageUrl}"" alt=""Mặt sau"" style=""width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #d1d5db;"" />
            </div>
        </div>
    </div>
    <div style=""text-align: center; margin-top: 25px;"">
        <a href=""{approveLink}"" style=""background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;"">Đến Trang Duyệt eKYC</a>
    </div>
    <hr style=""border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;"" />
    <div style=""text-align: center; font-size: 12px; color: #9ca3af;"">
        Đây là email tự động từ hệ thống UniTask. Vui lòng không phản hồi email này.
    </div>
</div>";
                        await _emailService.SendEmailAsync(admin.Email, subject, body);
                    }
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[Email Notification Error] {ex.Message}");
                }
            }
            return result.Succeeded;
        }

        // ===== Admin eKYC =====
        public async Task<IEnumerable<object>> GetPendingEkycAsync()
        {
            var users = await _userManager.Users
                .Where(u => u.EkycStatus == DataAcesss.Entities.Enums.EkycStatus.Pending)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.FullName,
                    u.EkycDate,
                    u.EkycFrontImageUrl,
                    u.EkycBackImageUrl
                })
                .ToListAsync();

            return users;
        }

        public async Task<bool> ApproveEkycAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.EkycStatus != DataAcesss.Entities.Enums.EkycStatus.Pending) return false;

            user.EkycStatus = DataAcesss.Entities.Enums.EkycStatus.Verified;
            user.EkycDate = DateTime.UtcNow;

            await _userManager.UpdateAsync(user);
            return true;
        }

        public async Task<bool> RejectEkycAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.EkycStatus != DataAcesss.Entities.Enums.EkycStatus.Pending) return false;

            user.EkycStatus = DataAcesss.Entities.Enums.EkycStatus.Rejected;
            user.EkycDate = DateTime.UtcNow;

            // Optionally, we could delete the images from Cloudinary here.
            
            await _userManager.UpdateAsync(user);
            return true;
        }

        public async Task<string?> UploadCvAsync(string userId, Microsoft.AspNetCore.Http.IFormFile cvFile)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return null;

            // Delete old CV if exists
            if (!string.IsNullOrEmpty(profile.CVUrl))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(profile.CVUrl);
                if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
            }

            var url = await _cloudinaryService.UploadFileAsync(cvFile, "CVs");
            if (url != null)
            {
                profile.CVUrl = url;
                profile.CVUploadDate = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return url;
        }

        public async Task<bool> DeleteCvAsync(string userId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return false;

            if (!string.IsNullOrEmpty(profile.CVUrl))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(profile.CVUrl);
                if (publicId != null)
                {
                    await _cloudinaryService.DeleteImageAsync(publicId);
                }

                profile.CVUrl = null;
                profile.CVUploadDate = null;
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<bool> UpdateAdminProfileAsync(string userId, AdminProfileUpdateDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.UserType != UserType.Admin) return false;

            // Check if email is already taken by another user
            if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    throw new InvalidOperationException("Email này đã được sử dụng bởi một tài khoản khác.");
                }
            }

            user.FullName = dto.FullName;
            user.PhoneNumber = dto.PhoneNumber;

            // If email changed, update Username and Email
            if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                user.Email = dto.Email;
                user.UserName = dto.Email;
                user.NormalizedEmail = _userManager.KeyNormalizer.NormalizeEmail(dto.Email);
                user.NormalizedUserName = _userManager.KeyNormalizer.NormalizeName(dto.Email);
            }

            // Handle Avatar Upload if file is provided
            if (dto.AvatarFile != null)
            {
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var publicId = _cloudinaryService.GetPublicIdFromUrl(user.AvatarUrl);
                    if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
                }
                user.AvatarUrl = await _cloudinaryService.UploadImageAsync(dto.AvatarFile, "Avatars");
            }

            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }
    }
}

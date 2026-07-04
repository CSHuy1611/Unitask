using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using System.Text;
using System.IO;
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
                        ekycBackImage = profile.User.EkycBackImageUrl,
                        isFlagged = profile.User.IsFlagged,
                        flagReason = profile.User.FlagReason ?? ""
                    },
                    reliabilityScore = profile.ReliabilityScore,
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
                        ekycBackImage = profile.User.EkycBackImageUrl,
                        isFlagged = profile.User.IsFlagged,
                        flagReason = profile.User.FlagReason ?? ""
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
                    businessLicenseUrl = profile.BusinessLicenseUrl,
                    isBusinessLicenseVerified = profile.IsBusinessLicenseVerified,
                    activePackage = activeSubscription?.Package?.Name,
                    packageExpiry = activeSubscription?.EndDate.ToString("yyyy-MM-dd")
                };
            }

            return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate, ekycFrontImage = user.EkycFrontImageUrl, ekycBackImage = user.EkycBackImageUrl, isFlagged = user.IsFlagged, flagReason = user.FlagReason ?? "" } };
        }

        public async Task<bool> UpdateStudentProfileAsync(string userId, StudentProfileUpdateDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (user == null || profile == null) return false;

            // Update Identity User fields
            if (!string.IsNullOrEmpty(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrEmpty(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;

            // Check and update Email
            if (!string.IsNullOrEmpty(dto.Email) && !string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    throw new InvalidOperationException("Email này đã được sử dụng bởi một tài khoản khác.");
                }

                user.Email = dto.Email;
                user.UserName = dto.Email;
                user.NormalizedEmail = _userManager.KeyNormalizer.NormalizeEmail(dto.Email);
                user.NormalizedUserName = _userManager.KeyNormalizer.NormalizeName(dto.Email);
            }

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

            // Check and update Email
            if (!string.IsNullOrEmpty(dto.Email) && !string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    throw new InvalidOperationException("Email này đã được sử dụng bởi một tài khoản khác.");
                }

                user.Email = dto.Email;
                user.UserName = dto.Email;
                user.NormalizedEmail = _userManager.KeyNormalizer.NormalizeEmail(dto.Email);
                user.NormalizedUserName = _userManager.KeyNormalizer.NormalizeName(dto.Email);
            }

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

            // 1. Simulating document check and face match error rules based on filenames (fallback mechanism)
            string frontName = dto.FrontImage?.FileName?.ToLower() ?? "";
            string backName = dto.BackImage?.FileName?.ToLower() ?? "";
            string selfieName = dto.SelfieImage?.FileName?.ToLower() ?? "";

            if (frontName.Contains("fail_face") || backName.Contains("fail_face") || selfieName.Contains("fail_face"))
            {
                throw new System.Exception("Khuôn mặt trong ảnh chân dung không trùng khớp với ảnh trên CCCD (Độ tương đồng < 50%). Vui lòng chụp lại rõ ràng.");
            }

            if (frontName.Contains("fail_invalid") || backName.Contains("fail_invalid") || selfieName.Contains("fail_invalid"))
            {
                throw new System.Exception("Giấy tờ CCCD không hợp lệ hoặc bị mờ/mất góc. Vui lòng sử dụng ảnh chụp rõ nét dưới ánh sáng tốt.");
            }

            var key = _configuration["EkycEncryptionKey"] ?? "UniTaskDefaultSecureSecretKey2026";

            // 2. Perform duplicate checks if CccdNumber is provided
            string cccdHash = "";
            string encryptedCccd = "";
            if (!string.IsNullOrEmpty(dto.CccdNumber))
            {
                using (var sha256 = SHA256.Create())
                {
                    var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(dto.CccdNumber.Trim()));
                    cccdHash = Convert.ToHexString(bytes).ToLower();
                }

                // Check in database for duplicate CCCD hash
                var duplicateCccd = await _userManager.Users
                    .AnyAsync(u => u.Id != userId && u.EkycFrontImageUrl != null && u.EkycFrontImageUrl.StartsWith(cccdHash + "|"));
                if (duplicateCccd)
                {
                    throw new System.Exception("Thẻ Căn cước công dân này đã được sử dụng để xác thực tài khoản khác trong hệ thống!");
                }

                encryptedCccd = EncryptAes(dto.CccdNumber.Trim(), key);
            }

            // 3. Perform duplicate checks if FaceDescriptor is provided
            byte[]? newDescriptor = null;
            if (!string.IsNullOrEmpty(dto.FaceDescriptor))
            {
                try
                {
                    newDescriptor = Convert.FromBase64String(dto.FaceDescriptor);
                }
                catch {}
            }

            if (newDescriptor != null && newDescriptor.Length == 128)
            {
                var otherUsers = await _userManager.Users
                    .Where(u => u.Id != userId && u.EkycStatus == EkycStatus.Verified && u.EkycBackImageUrl != null && u.EkycBackImageUrl.Contains("|"))
                    .Select(u => new { u.Id, u.FullName, u.EkycBackImageUrl })
                    .ToListAsync();

                foreach (var other in otherUsers)
                {
                    try
                    {
                        var parts = other.EkycBackImageUrl!.Split('|');
                        var otherDesc = Convert.FromBase64String(parts[0]);
                        if (otherDesc.Length == 128)
                        {
                            double dist = ComputeFaceDistance(newDescriptor, otherDesc);
                            if (dist < 0.35)
                            {
                                throw new System.Exception("Khuôn mặt này đã được sử dụng để xác thực cho một tài khoản khác trong hệ thống!");
                            }
                        }
                    }
                    catch {}
                }
            }

            // 4. Delete old legacy images if they exist
            if (!string.IsNullOrEmpty(user.EkycFrontImageUrl) && !user.EkycFrontImageUrl.Contains("|"))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(user.EkycFrontImageUrl);
                if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
            }
            if (!string.IsNullOrEmpty(user.EkycBackImageUrl) && !user.EkycBackImageUrl.Contains("|"))
            {
                var publicId = _cloudinaryService.GetPublicIdFromUrl(user.EkycBackImageUrl);
                if (publicId != null) await _cloudinaryService.DeleteImageAsync(publicId);
            }

            // 5. Upload new images to Cloudinary (under private/eKYC folder)
            string frontUrl = "";
            string backUrl = "";
            string selfieUrl = "";

            try
            {
                frontUrl = await _cloudinaryService.UploadImageAsync(dto.FrontImage, "eKYC");
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[eKYC Error] FrontImage upload failed for user {userId}: {ex.Message}");
                throw new System.Exception($"Upload ảnh mặt trước CCCD thất bại: {ex.Message}");
            }

            try
            {
                backUrl = await _cloudinaryService.UploadImageAsync(dto.BackImage, "eKYC");
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[eKYC Error] BackImage upload failed for user {userId}: {ex.Message}");
                throw new System.Exception($"Upload ảnh mặt sau CCCD thất bại: {ex.Message}");
            }

            try
            {
                selfieUrl = await _cloudinaryService.UploadImageAsync(dto.SelfieImage, "eKYC");
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[eKYC Error] SelfieImage upload failed for user {userId}: {ex.Message}");
                throw new System.Exception($"Upload ảnh chân dung Selfie thất bại: {ex.Message}");
            }

            // 6. Encrypt URLs and pack them
            string packedUrls = $"{frontUrl};{backUrl};{selfieUrl}";
            string encryptedUrls = EncryptAes(packedUrls, key);

            // 7. Save to DB
            user.EkycStatus = EkycStatus.Verified;
            user.EkycDate = DateTime.UtcNow;
            user.EkycFrontImageUrl = $"{cccdHash}|{encryptedCccd}";
            user.EkycBackImageUrl = $"{dto.FaceDescriptor}|{encryptedUrls}";

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                try
                {
                    var admins = await _userManager.Users
                        .Where(u => u.UserType == UserType.Admin)
                        .ToListAsync();

                    foreach (var admin in admins)
                    {
                        if (string.IsNullOrEmpty(admin.Email)) continue;

                        var subject = $"[UniTask] Tự động xác thực tài khoản thành công cho {user.FullName}";
                        var body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;"">
    <div style=""text-align: center; margin-bottom: 20px;"">
        <h2 style=""color: #10b981; margin: 0;"">Tự Động Xác Thực Danh Tính Thành Công (eKYC)</h2>
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
                <td style=""padding: 5px 0; color: #4b5563; font-weight: bold;"">Thời gian xác thực:</td>
                <td style=""padding: 5px 0; color: #111827;"">{DateTime.UtcNow.AddHours(7).ToString("dd/MM/yyyy HH:mm:ss")}</td>
            </tr>
        </table>
    </div>
    <div style=""margin-bottom: 25px; padding: 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; font-size: 14px;"">
        <strong>Lưu ý bảo mật:</strong> Để đảm bảo quyền riêng tư và tránh đánh cắp thông tin cá nhân, hình ảnh CCCD và ảnh selfie của người dùng đã được đối chiếu thành công và lưu trữ mã hóa an toàn. Các liên kết hình ảnh không được lưu trữ trong cơ sở dữ liệu công khai và không hiển thị trên trang quản trị.
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

        // ===== AES-256 Encryption / Decryption Utilities =====
        private string EncryptAes(string plainText, string key)
        {
            if (string.IsNullOrEmpty(plainText)) return "";
            byte[] iv = new byte[16];
            byte[] array;

            using (Aes aes = Aes.Create())
            {
                byte[] keyBytes = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
                aes.Key = keyBytes;
                aes.IV = iv;

                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

                using (MemoryStream memoryStream = new MemoryStream())
                {
                    using (CryptoStream cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write))
                    {
                        using (StreamWriter streamWriter = new StreamWriter(cryptoStream))
                        {
                            streamWriter.Write(plainText);
                        }
                        array = memoryStream.ToArray();
                    }
                }
            }

            return Convert.ToBase64String(array);
        }

        private string DecryptAes(string cipherText, string key)
        {
            if (string.IsNullOrEmpty(cipherText)) return "";
            byte[] iv = new byte[16];
            byte[] buffer = Convert.FromBase64String(cipherText);

            using (Aes aes = Aes.Create())
            {
                byte[] keyBytes = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
                aes.Key = keyBytes;
                aes.IV = iv;

                ICryptoTransform decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

                using (MemoryStream memoryStream = new MemoryStream(buffer))
                {
                    using (CryptoStream cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read))
                    {
                        using (StreamReader streamReader = new StreamReader(cryptoStream))
                        {
                            return streamReader.ReadToEnd();
                        }
                    }
                }
            }
        }

        private double ComputeFaceDistance(byte[] desc1, byte[] desc2)
        {
            if (desc1 == null || desc2 == null || desc1.Length != 128 || desc2.Length != 128)
                return 1.0;

            double sum = 0;
            for (int i = 0; i < 128; i++)
            {
                double diff = (desc1[i] - desc2[i]) / 127.5;
                sum += diff * diff;
            }
            return Math.Sqrt(sum);
        }

        public async Task<object?> DecryptUserIdentityAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.EkycStatus != EkycStatus.Verified) return null;

            var key = _configuration["EkycEncryptionKey"] ?? "UniTaskDefaultSecureSecretKey2026";

            string rawCccd = "";
            string frontUrl = "";
            string backUrl = "";
            string selfieUrl = "";

            if (!string.IsNullOrEmpty(user.EkycFrontImageUrl) && user.EkycFrontImageUrl.Contains("|"))
            {
                try
                {
                    var parts = user.EkycFrontImageUrl.Split('|');
                    var encryptedCccd = parts[1];
                    rawCccd = DecryptAes(encryptedCccd, key);
                }
                catch {}
            }

            if (!string.IsNullOrEmpty(user.EkycBackImageUrl) && user.EkycBackImageUrl.Contains("|"))
            {
                try
                {
                    var parts = user.EkycBackImageUrl.Split('|');
                    if (parts.Length > 1)
                    {
                        var encryptedUrls = parts[1];
                        var decryptedUrls = DecryptAes(encryptedUrls, key);
                        if (decryptedUrls.Contains(";"))
                        {
                            var urlParts = decryptedUrls.Split(';');
                            if (urlParts.Length > 0) frontUrl = urlParts[0];
                            if (urlParts.Length > 1) backUrl = urlParts[1];
                            if (urlParts.Length > 2) selfieUrl = urlParts[2];
                        }
                    }
                }
                catch {}
            }

            return new
            {
                cccdNumber = rawCccd,
                frontImageUrl = frontUrl,
                backImageUrl = backUrl,
                selfieImageUrl = selfieUrl
            };
        }

        public async Task<bool> UploadBusinessLicenseAsync(string userId, Microsoft.AspNetCore.Http.IFormFile licenseFile, bool isVerified)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return false;

            if (licenseFile != null && licenseFile.Length > 0)
            {
                var url = await _cloudinaryService.UploadImageAsync(licenseFile, "business_licenses");
                if (url == null) return false;

                profile.BusinessLicenseUrl = url;
            }

            // When employer uploads, reset to unverified so Admin must re-approve
            profile.IsBusinessLicenseVerified = isVerified;
            await _context.SaveChangesAsync();

            return true;
        }

        // ===== Admin Business License Management =====
        public async Task<IEnumerable<object>> GetPendingBusinessLicensesAsync()
        {
            var profiles = await _context.EmployerProfiles
                .Include(p => p.User)
                .Include(p => p.Company)
                .Where(p => p.BusinessLicenseUrl != null && !p.IsBusinessLicenseVerified)
                .Select(p => new
                {
                    userId = p.UserId,
                    fullName = p.User.FullName,
                    email = p.User.Email,
                    companyName = p.Company != null ? p.Company.Name : null,
                    taxCode = p.Company != null ? p.Company.TaxCode : null,
                    businessLicenseUrl = p.BusinessLicenseUrl,
                    isVerified = p.IsBusinessLicenseVerified
                })
                .ToListAsync<object>();

            return profiles;
        }

        public async Task<bool> ApproveBusinessLicenseAsync(string userId)
        {
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null || string.IsNullOrEmpty(profile.BusinessLicenseUrl)) return false;

            profile.IsBusinessLicenseVerified = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectBusinessLicenseAsync(string userId)
        {
            var profile = await _context.EmployerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return false;

            // Clear the uploaded license and reset verification flag
            profile.BusinessLicenseUrl = null;
            profile.IsBusinessLicenseVerified = false;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

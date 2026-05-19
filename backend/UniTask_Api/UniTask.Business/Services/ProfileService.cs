using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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

        public ProfileService(UserManager<ApplicationUser> userManager, AppDbContext context, ICloudinaryService cloudinaryService)
        {
            _userManager = userManager;
            _context = context;
            _cloudinaryService = cloudinaryService;
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
                
                if (profile == null) return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate } };

                return new
                {
                    user = new
                    {
                        fullName = profile.User.FullName,
                        email = profile.User.Email,
                        phoneNumber = profile.User.PhoneNumber,
                        avatarUrl = profile.User.AvatarUrl,
                        ekycStatus = profile.User.EkycStatus,
                        ekycDate = profile.User.EkycDate
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

                if (profile == null) return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate } };

                return new
                {
                    user = new
                    {
                        fullName = profile.User.FullName,
                        email = profile.User.Email,
                        phoneNumber = profile.User.PhoneNumber,
                        avatarUrl = profile.User.AvatarUrl,
                        ekycStatus = profile.User.EkycStatus,
                        ekycDate = profile.User.EkycDate
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
                    } : null
                };
            }

            return new { user = new { fullName = user.FullName, email = user.Email, phoneNumber = user.PhoneNumber, avatarUrl = user.AvatarUrl, ekycStatus = user.EkycStatus, ekycDate = user.EkycDate } };
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

            user.EkycFrontImageUrl = await _cloudinaryService.UploadImageAsync(dto.FrontImage, "eKYC");
            user.EkycBackImageUrl = await _cloudinaryService.UploadImageAsync(dto.BackImage, "eKYC");
            user.EkycStatus = EkycStatus.Pending;
            user.EkycDate = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
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
    }
}

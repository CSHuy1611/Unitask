using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Application;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.Business.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly AppDbContext _context;

        public ApplicationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ApplicationDto?> ApplyJobAsync(int jobId, string studentId, ApplicationCreateDto dto)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null || job.Status != JobStatus.Open)
                return null; // Cannot apply to closed or non-existent jobs

            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return null;

            // VIP Job check
            if (profile.ReliabilityScore < job.RequiredReliabilityScore)
            {
                throw new System.InvalidOperationException($"Công việc này yêu cầu điểm tín nhiệm tối thiểu là {job.RequiredReliabilityScore}. Điểm hiện tại của bạn là {profile.ReliabilityScore}.");
            }

            // Low Reliability Score restriction
            if (profile.ReliabilityScore < 60)
            {
                var oneWeekAgo = DateTime.UtcNow.AddDays(-7);
                var appsThisWeek = await _context.Applications
                    .CountAsync(a => a.StudentProfileId == profile.Id && a.AppliedDate >= oneWeekAgo);

                if (appsThisWeek >= 3)
                {
                    throw new System.InvalidOperationException("Hệ thống giới hạn tối đa 3 lượt ứng tuyển mỗi tuần đối với tài khoản dưới 60 điểm tín nhiệm.");
                }
            }

            var user = await _context.Users.FindAsync(studentId);
            if (user != null && user.BlacklistCount >= 3)
            {
                throw new System.InvalidOperationException("Tài khoản của bạn đã bị khóa ứng tuyển do vi phạm chính sách của hệ thống.");
            }

            var existingApp = await _context.Applications
                .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentProfileId == profile.Id);
            
            if (existingApp != null)
                return null; // Already applied

            var application = new Application
            {
                JobId = jobId,
                StudentProfileId = profile.Id,
                Status = ApplicationStatus.Applied,
                AppliedDate = DateTime.UtcNow
            };

            _context.Applications.Add(application);

            // Update Job ApplicationsCount
            job.ApplicationsCount++;

            await _context.SaveChangesAsync();

            // Load relations for mapping
            await _context.Entry(application).Reference(a => a.Job).LoadAsync();
            await _context.Entry(application).Reference(a => a.StudentProfile).Query().Include(p => p.User).LoadAsync();

            return MapToDto(application);
        }

        public async Task<IEnumerable<ApplicationDto>> GetApplicationsForJobAsync(int jobId, string employerId)
        {
            // Verify employer owns this job
            var job = await _context.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId);
            if (job == null) return new List<ApplicationDto>();

            var applications = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile).ThenInclude(p => p.User)
                .Where(a => a.JobId == jobId)
                .OrderBy(a => a.StudentProfile.ReliabilityScore < 60 ? 1 : 0)
                .ThenByDescending(a => a.AppliedDate)
                .ToListAsync();

            return applications.Select(MapToDto);
        }

        public async Task<IEnumerable<ApplicationDto>> GetStudentApplicationsAsync(string studentId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return new List<ApplicationDto>();

            var applications = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile).ThenInclude(p => p.User)
                .Where(a => a.StudentProfileId == profile.Id)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync();

            return applications.Select(MapToDto);
        }

        public async Task<bool> UpdateApplicationStatusAsync(int applicationId, string employerId, ApplicationStatus status)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.Job.EmployerId != employerId)
                return false; // Not found or employer doesn't own this job

            if (status == ApplicationStatus.Accepted)
            {
                // Count current accepted/completed apps
                var currentAcceptedCount = await _context.Applications
                    .CountAsync(a => a.JobId == application.JobId && a.Id != applicationId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed));

                if (currentAcceptedCount >= application.Job.HeadCount)
                {
                    throw new InvalidOperationException("Đã tuyển đủ số lượng sinh viên cho công việc này.");
                }

                application.Status = status;

                if (currentAcceptedCount + 1 >= application.Job.HeadCount)
                {
                    application.Job.Status = JobStatus.InProgress;
                    var pendingApps = await _context.Applications
                        .Where(a => a.JobId == application.JobId && a.Id != applicationId && (a.Status == ApplicationStatus.Applied || a.Status == ApplicationStatus.Interviewing))
                        .ToListAsync();

                    foreach (var pendingApp in pendingApps)
                    {
                        pendingApp.Status = ApplicationStatus.Rejected;
                    }
                }
            }
            else
            {
                application.Status = status;

                // If the application is rejected after being accepted 
                if (status == ApplicationStatus.Rejected || status == ApplicationStatus.Cancelled)
                {
                    // Check if there are any other accepted applications
                    var hasOtherAccepted = await _context.Applications
                        .AnyAsync(a => a.JobId == application.JobId && a.Id != applicationId && a.Status == ApplicationStatus.Accepted);
                    
                    if (!hasOtherAccepted)
                    {
                        application.Job.Status = JobStatus.Open;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        private static ApplicationDto MapToDto(Application a)
        {
            var skillsList = new List<string>();
            if (!string.IsNullOrEmpty(a.StudentProfile?.Skills))
            {
                // Handle both comma-separated lists and simple JSON string arrays safely
                skillsList = a.StudentProfile.Skills
                    .Split(new[] { ',', '[', ']', '"' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim())
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();
            }

            return new ApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                JobTitle = a.Job?.Title ?? "",
                StudentId = a.StudentProfile?.UserId ?? "",
                StudentName = a.StudentProfile?.User?.FullName ?? "",
                StudentAvatarUrl = a.StudentProfile?.User?.AvatarUrl,
                StudentUniversity = a.StudentProfile?.University,
                StudentMajor = a.StudentProfile?.Major,
                StudentYear = a.StudentProfile?.Year,
                StudentBio = a.StudentProfile?.Bio,
                StudentEkycStatus = a.StudentProfile?.User?.EkycStatus.ToString(),
                StudentSkills = skillsList,
                StudentCVUrl = a.StudentProfile?.CVUrl,
                StudentGpa = a.StudentProfile?.GPA,
                StudentReliabilityScore = a.StudentProfile?.ReliabilityScore ?? 100,
                Status = a.Status,
                AppliedDate = a.AppliedDate,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime
            };
        }
    }
}

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
                .OrderByDescending(a => a.AppliedDate)
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

            application.Status = status;

            // If accepted, update the job status and assign the student
            if (status == ApplicationStatus.Accepted)
            {
                // We need the user ID for SelectedStudentId
                await _context.Entry(application).Reference(a => a.StudentProfile).LoadAsync();
                
                application.Job.Status = JobStatus.InProgress;
                application.Job.SelectedStudentId = application.StudentProfile.UserId;

                // Optionally, we could automatically reject other pending applications for this job here
                var otherApps = await _context.Applications
                    .Where(a => a.JobId == application.JobId && a.Id != applicationId && a.Status == ApplicationStatus.Applied)
                    .ToListAsync();

                foreach (var app in otherApps)
                {
                    app.Status = ApplicationStatus.Rejected;
                }
            }
            // If the application is rejected after being accepted (employer changed mind before student started?), 
            // we might need logic to reopen the job, but for now we'll keep it simple.
            else if (status == ApplicationStatus.Rejected)
            {
                 // We don't have access to studentId directly without loading the profile
                 await _context.Entry(application).Reference(a => a.StudentProfile).LoadAsync();
                 if (application.Job.SelectedStudentId == application.StudentProfile.UserId)
                 {
                     application.Job.Status = JobStatus.Open;
                     application.Job.SelectedStudentId = null;
                 }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        private static ApplicationDto MapToDto(Application a)
        {
            return new ApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                JobTitle = a.Job?.Title ?? "",
                StudentId = a.StudentProfile?.UserId ?? "",
                StudentName = a.StudentProfile?.User?.FullName ?? "",
                StudentAvatarUrl = a.StudentProfile?.User?.AvatarUrl,
                Status = a.Status,
                AppliedDate = a.AppliedDate
            };
        }
    }
}

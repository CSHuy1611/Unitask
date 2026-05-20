using Microsoft.EntityFrameworkCore;
using UniTask.Business.DTOs.Job;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;

namespace UniTask.Business.Services
{
    public class SavedJobService : ISavedJobService
    {
        private readonly AppDbContext _context;

        public SavedJobService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> SaveJobAsync(string studentId, int jobId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return false;

            var existing = await _context.SavedJobs.FirstOrDefaultAsync(s => s.StudentProfileId == profile.Id && s.JobId == jobId);
            if (existing != null) return true; // Already saved

            _context.SavedJobs.Add(new SavedJob
            {
                StudentProfileId = profile.Id,
                JobId = jobId,
                SavedDate = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UnsaveJobAsync(string studentId, int jobId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return false;

            var existing = await _context.SavedJobs.FirstOrDefaultAsync(s => s.StudentProfileId == profile.Id && s.JobId == jobId);
            if (existing == null) return false;

            _context.SavedJobs.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<JobDto>> GetSavedJobsAsync(string studentId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return new List<JobDto>();

            var savedJobs = await _context.SavedJobs
                .Include(s => s.Job)
                    .ThenInclude(j => j.Company)
                .Include(s => s.Job)
                    .ThenInclude(j => j.Tags)
                .Where(s => s.StudentProfileId == profile.Id)
                .OrderByDescending(s => s.SavedDate)
                .Select(s => s.Job)
                .ToListAsync();

            return savedJobs.Select(MapToDto);
        }

        public async Task<bool> IsJobSavedAsync(string studentId, int jobId)
        {
            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return false;

            return await _context.SavedJobs.AnyAsync(s => s.StudentProfileId == profile.Id && s.JobId == jobId);
        }

        // Reuse mapping logic (or refactor to a common mapper class later)
        private static JobDto MapToDto(Job j)
        {
            var salaryRange = new List<decimal>();
            if (!string.IsNullOrEmpty(j.SalaryText) && j.SalaryText.Contains("-"))
            {
                var parts = j.SalaryText.Split('-');
                foreach (var part in parts)
                {
                    if (decimal.TryParse(part, out decimal val))
                        salaryRange.Add(val);
                }
            }

            return new JobDto
            {
                Id = j.Id,
                Title = j.Title,
                Description = j.Description,
                Location = j.Location,
                Type = j.Type,
                SalaryText = j.SalaryText,
                SalaryRange = salaryRange,
                Budget = j.Budget,
                Commission = j.Commission,
                PostedDate = j.PostedDate,
                Deadline = j.Deadline,
                Views = j.Views,
                ApplicationsCount = j.ApplicationsCount,
                IsUrgent = j.IsUrgent,
                IsRemote = j.IsRemote,
                Status = j.Status,
                CompanyId = j.CompanyId,
                CompanyName = j.Company?.Name,
                CompanyLogoUrl = j.Company?.LogoUrl,
                Tags = j.Tags?.Select(t => t.TagName).ToList() ?? new List<string>()
            };
        }
    }
}

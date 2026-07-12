using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using UniTask.Business.DTOs.Application;
using UniTask.Business.Interfaces;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;
using Microsoft.AspNetCore.SignalR;
using UniTask.Business.Hubs;

namespace UniTask.Business.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<DashboardHub> _hubContext;

        public ApplicationService(AppDbContext context, IHubContext<DashboardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<ApplicationDto?> ApplyJobAsync(int jobId, string studentId, ApplicationCreateDto dto)
        {
            var job = await _context.Jobs.FindAsync(jobId);
            if (job == null) return null;

            if (job.Status != JobStatus.Open)
            {
                throw new System.InvalidOperationException("Công việc này đã đóng đăng ký hoặc đã tuyển đủ người.");
            }

            var profile = await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == studentId);
            if (profile == null) return null;

            // Kiểm tra điểm uy tín dưới 80 và thời gian khóa 3 ngày
            if (profile.ReliabilityScore < 80)
            {
                if (profile.ReliabilityBlockedUntil.HasValue && DateTime.UtcNow < profile.ReliabilityBlockedUntil.Value)
                {
                    // Chuyển đổi thời gian khóa sang giờ Việt Nam (UTC+7) để hiển thị thân thiện
                    var recoveryTimeLocal = profile.ReliabilityBlockedUntil.Value.AddHours(7).ToString("dd/MM/yyyy HH:mm");
                    throw new System.InvalidOperationException($"Bạn không đủ điểm uy tín để ứng tuyển việc làm vì dưới 80 điểm. Bạn cần 3 ngày để phục hồi. Ngày khôi phục dự kiến: {recoveryTimeLocal}");
                }
                else
                {
                    // Đã qua 3 ngày: Tự động khôi phục điểm về 85 và gỡ khóa
                    profile.ReliabilityScore = 85;
                    profile.ReliabilityBlockedUntil = null;
                }
            }

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
            await _hubContext.Clients.All.SendAsync("JobApplicationAdded", jobId);

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
                    .CountAsync(a => a.JobId == application.JobId && a.Id != applicationId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed || a.Status == ApplicationStatus.Interviewing));

                if (currentAcceptedCount >= application.Job.HeadCount)
                {
                    throw new InvalidOperationException("Đã tuyển đủ số lượng sinh viên cho công việc này.");
                }

                application.Status = status;

                // Nếu số lượng hiện tại (đã cộng ứng viên vừa được nhận) bằng HeadCount -> Đã tuyển đủ
                if (currentAcceptedCount + 1 >= application.Job.HeadCount)
                {
                    // Lấy tất cả các ứng viên đang chờ của job này và Reject họ
                    var pendingApplications = await _context.Applications
                        .Where(a => a.JobId == application.JobId && a.Id != applicationId && a.Status == ApplicationStatus.Applied)
                        .ToListAsync();

                    foreach (var pendingApp in pendingApplications)
                    {
                        pendingApp.Status = ApplicationStatus.Rejected;
                        pendingApp.RejectReason = "Đã tìm được ứng viên phù hợp chúc bạn may mắn lần sau";
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
            await _hubContext.Clients.All.SendAsync("ApplicationStatusChanged", application.JobId);
            return true;
        }

        public async Task<string?> GenerateOtpAsync(int applicationId, string employerId, string otpType)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.Job.EmployerId != employerId) return null;
            if (application.Status != ApplicationStatus.Accepted && application.Status != ApplicationStatus.Completed) return null;

            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            var expiry = DateTime.UtcNow.AddMinutes(5);

            if (otpType == "checkin")
            {
                application.CheckInOtp = otp;
                application.CheckInOtpExpiredAt = expiry;
            }
            else if (otpType == "checkout")
            {
                application.CheckOutOtp = otp;
                application.CheckOutOtpExpiredAt = expiry;
            }

            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<CheckInOutResponseDto> StudentCheckInAsync(int applicationId, string studentId, string otp)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.StudentProfile.UserId != studentId)
            {
                return new CheckInOutResponseDto { Success = false, Message = "Không tìm thấy hồ sơ đăng ký của sinh viên." };
            }
            
            if (application.CheckInOtp != otp || application.CheckInOtpExpiredAt < DateTime.UtcNow)
            {
                return new CheckInOutResponseDto { Success = false, Message = "Mã OTP check-in không đúng hoặc đã hết hạn." };
            }

            application.CheckInTime = DateTime.UtcNow;
            application.CheckInOtp = null; // Clear OTP

            var studentProfile = application.StudentProfile;
            var job = application.Job;
            string statusText = "";
            string reliabilityChangeText = "";

            if (studentProfile != null)
            {
                var oldScore = studentProfile.ReliabilityScore;
                var checkInLocal = application.CheckInTime.Value.AddHours(7);
                var checkInStr = checkInLocal.ToString("HH:mm");
                bool isEarly = false;
                bool isOnTime = false;
                bool isLate = false;

                if (job != null && job.WorkDate.HasValue && job.WorkStartTime.HasValue)
                {
                    var shiftStart = job.WorkDate.Value.Date + job.WorkStartTime.Value;
                    if (checkInLocal < shiftStart)
                    {
                        isEarly = true;
                        if (studentProfile.ReliabilityScore < 100)
                            studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                    }
                    else if (checkInLocal == shiftStart)
                    {
                        isOnTime = true;
                        if (studentProfile.ReliabilityScore < 100)
                            studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                    }
                    else
                    {
                        isLate = true;
                        studentProfile.ReliabilityScore = Math.Max(0, studentProfile.ReliabilityScore - 1);

                        // Nếu dưới 80 điểm, thiết lập thời gian khóa 3 ngày
                        if (studentProfile.ReliabilityScore < 80 &&
                            (!studentProfile.ReliabilityBlockedUntil.HasValue || DateTime.UtcNow >= studentProfile.ReliabilityBlockedUntil.Value))
                        {
                            studentProfile.ReliabilityBlockedUntil = DateTime.UtcNow.AddDays(3);
                        }
                    }
                }
                else
                {
                    isOnTime = true;
                    if (studentProfile.ReliabilityScore < 100)
                        studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                }

                var newScore = studentProfile.ReliabilityScore;

                if (isEarly)
                {
                    if (oldScore >= 100)
                    {
                        statusText = $"Bạn đã check-in sớm lúc {checkInStr}. Điểm uy tín của bạn vẫn giữ nguyên 100";
                        reliabilityChangeText = "Điểm uy tín được giữ nguyên ở mức tối đa 100/100.";
                    }
                    else
                    {
                        statusText = $"Bạn đã check-in sớm lúc {checkInStr}! Bạn được cộng 1 điểm uy tín";
                        reliabilityChangeText = $"Bạn được cộng 1 điểm uy tín (Lên {newScore}/100).";
                    }
                }
                else if (isOnTime)
                {
                    if (oldScore >= 100)
                    {
                        statusText = $"Bạn đã check-in đúng giờ lúc {checkInStr}. Điểm uy tín của bạn vẫn giữ nguyên 100";
                        reliabilityChangeText = "Điểm uy tín được giữ nguyên ở mức tối đa 100/100.";
                    }
                    else
                    {
                        statusText = $"Bạn đã check-in đúng giờ lúc {checkInStr}! Bạn được cộng 1 điểm uy tín";
                        reliabilityChangeText = $"Bạn được cộng 1 điểm uy tín (Lên {newScore}/100).";
                    }
                }
                else // isLate
                {
                    statusText = $"Bạn đã check-in muộn lúc {checkInStr}! Bạn bị trừ 1 điểm uy tín";
                    reliabilityChangeText = $"Bạn bị trừ 1 điểm uy tín (Còn {newScore}/100).";
                }
            }

            if (studentProfile != null)
            {
                studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore);
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationCheckInOccurred", application.JobId);
            
            // Notify employer via SignalR
            await _hubContext.Clients.All.SendAsync("CheckInSuccess", application.Id);

            return new CheckInOutResponseDto
            {
                Success = true,
                Message = "Check-in thành công.",
                StatusText = statusText,
                ReliabilityChangeText = reliabilityChangeText
            };
        }

        public async Task<CheckInOutResponseDto> StudentCheckOutAsync(int applicationId, string studentId, string otp)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.StudentProfile.UserId != studentId)
            {
                return new CheckInOutResponseDto { Success = false, Message = "Không tìm thấy hồ sơ đăng ký của sinh viên." };
            }
            
            if (application.CheckOutOtp != otp || application.CheckOutOtpExpiredAt < DateTime.UtcNow)
            {
                return new CheckInOutResponseDto { Success = false, Message = "Mã OTP check-out không đúng hoặc đã hết hạn." };
            }

            application.CheckOutTime = DateTime.UtcNow;
            application.CheckOutOtp = null; // Clear OTP

            var studentProfile = application.StudentProfile;
            var job = application.Job;
            string statusText = "";
            string reliabilityChangeText = "";

            if (studentProfile != null)
            {
                var oldScore = studentProfile.ReliabilityScore;
                var checkOutLocal = application.CheckOutTime.Value.AddHours(7);
                var checkOutStr = checkOutLocal.ToString("HH:mm");
                bool isEarly = false;
                bool isOnTime = false;
                bool isLate = false;

                if (job != null && job.WorkDate.HasValue && job.WorkEndTime.HasValue)
                {
                    var shiftEnd = job.WorkDate.Value.Date + job.WorkEndTime.Value;
                    if (checkOutLocal > shiftEnd)
                    {
                        isLate = true;
                        if (studentProfile.ReliabilityScore < 100)
                            studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                    }
                    else if (checkOutLocal == shiftEnd)
                    {
                        isOnTime = true;
                        if (studentProfile.ReliabilityScore < 100)
                            studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                    }
                    else
                    {
                        isEarly = true;
                        studentProfile.ReliabilityScore = Math.Max(0, studentProfile.ReliabilityScore - 1);

                        // Nếu dưới 80 điểm, thiết lập thời gian khóa 3 ngày
                        if (studentProfile.ReliabilityScore < 80 &&
                            (!studentProfile.ReliabilityBlockedUntil.HasValue || DateTime.UtcNow >= studentProfile.ReliabilityBlockedUntil.Value))
                        {
                            studentProfile.ReliabilityBlockedUntil = DateTime.UtcNow.AddDays(3);
                        }
                    }
                }
                else
                {
                    isOnTime = true;
                    if (studentProfile.ReliabilityScore < 100)
                        studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore + 1);
                }

                var newScore = studentProfile.ReliabilityScore;

                if (isEarly)
                {
                    statusText = $"Bạn đã check-out sớm lúc {checkOutStr}! Bạn bị trừ 1 điểm uy tín";
                    reliabilityChangeText = $"Bạn bị trừ 1 điểm uy tín (Còn {newScore}/100).";
                }
                else if (isOnTime)
                {
                    if (oldScore >= 100)
                    {
                        statusText = $"Bạn đã check-out đúng giờ lúc {checkOutStr}. Điểm uy tín của bạn vẫn giữ nguyên 100";
                        reliabilityChangeText = "Điểm uy tín được giữ nguyên ở mức tối đa 100/100.";
                    }
                    else
                    {
                        statusText = $"Bạn đã check-out đúng giờ lúc {checkOutStr}! Bạn được cộng 1 điểm uy tín";
                        reliabilityChangeText = $"Bạn được cộng 1 điểm uy tín (Lên {newScore}/100).";
                    }
                }
                else // isLate
                {
                    if (oldScore >= 100)
                    {
                        statusText = $"Bạn đã check-out trễ lúc {checkOutStr}. Điểm uy tín của bạn vẫn giữ nguyên 100";
                        reliabilityChangeText = "Điểm uy tín được giữ nguyên ở mức tối đa 100/100.";
                    }
                    else
                    {
                        statusText = $"Bạn đã check-out trễ lúc {checkOutStr}! Bạn được cộng 1 điểm uy tín";
                        reliabilityChangeText = $"Bạn được cộng 1 điểm uy tín (Lên {newScore}/100).";
                    }
                }
            }

            if (studentProfile != null)
            {
                studentProfile.ReliabilityScore = Math.Min(100, studentProfile.ReliabilityScore);
            }

            await _context.SaveChangesAsync();

            // Auto-Approve Completion immediately
            await ApproveCompletionAsync(application.Id, application.Job.EmployerId);

            // Broadcast AFTER both checkout and approval are saved in DB
            await _hubContext.Clients.All.SendAsync("ApplicationCheckOutOccurred", application.JobId);
            await _hubContext.Clients.All.SendAsync("CheckOutSuccess", application.Id);

            return new CheckInOutResponseDto
            {
                Success = true,
                Message = "Check-out thành công.",
                StatusText = statusText,
                ReliabilityChangeText = reliabilityChangeText
            };
        }

        public async Task<bool> ReportNoShowAsync(int applicationId, string employerId, string reason, string evidenceUrl)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.Job.EmployerId != employerId) return false;
            
            application.Status = ApplicationStatus.Disputed;
            application.DisputeReason = reason;
            application.EmployerEvidenceUrl = evidenceUrl;
            application.DisputedDate = DateTime.UtcNow;

            // Notice: We NO LONGER penalize the student immediately.
            // The penalty and NoShow marking will be done by an Admin
            // during the dispute resolution process if the employer's claim is valid.
            
            // Escrow budget remains frozen.
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveCompletionAsync(int applicationId, string employerId)
        {
            var application = await _context.Applications
                .Include(a => a.Job)
                .Include(a => a.StudentProfile)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null || application.Job.EmployerId != employerId) return false;
            if (application.Status == ApplicationStatus.Completed && application.EscrowReleaseDate != null) return false;
            
            if (!application.CheckInTime.HasValue || !application.CheckOutTime.HasValue)
            {
                throw new InvalidOperationException("Sinh viên chưa hoàn thành quá trình Check-in và Check-out nên chưa thể nghiệm thu.");
            }
            
            application.Status = ApplicationStatus.Completed;
            application.EscrowReleaseDate = DateTime.UtcNow;

            var salaryPerPerson = Math.Round(application.Job.Budget / (application.Job.HeadCount > 0 ? application.Job.HeadCount : 1), 0);
            
            var studentId = application.StudentProfile?.UserId;
            if (studentId != null)
            {
                var studentWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
                if (studentWallet != null)
                {
                    studentWallet.Balance += salaryPerPerson;
                    _context.Transactions.Add(new DataAcesss.Entities.Transaction
                    {
                        WalletId = studentWallet.Id,
                        Amount = salaryPerPerson,
                        Type = DataAcesss.Entities.Enums.TransactionType.EscrowRelease,
                        Description = $"Nhận tiền công từ công việc: {application.Job.Title}",
                        RelatedJobId = application.JobId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            var allApps = await _context.Applications
                .Where(a => a.JobId == application.JobId && (a.Status == ApplicationStatus.Accepted || a.Status == ApplicationStatus.Completed))
                .ToListAsync();
                
            if (allApps.All(a => a.Status == ApplicationStatus.Completed))
            {
                application.Job.Status = DataAcesss.Entities.Enums.JobStatus.Completed;
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ApplicationApprovedOccurred", application.JobId);
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

            string? checkInStatusText = null;
            if (a.CheckInTime.HasValue)
            {
                var checkInLocal = a.CheckInTime.Value.AddHours(7);
                var checkInStr = checkInLocal.ToString("HH:mm");
                if (a.Job != null && a.Job.WorkDate.HasValue && a.Job.WorkStartTime.HasValue)
                {
                    var shiftStart = a.Job.WorkDate.Value.Date + a.Job.WorkStartTime.Value;
                    if (checkInLocal < shiftStart)
                    {
                        checkInStatusText = $"Check-in sớm lúc {checkInStr}! Bạn được cộng 1 điểm uy tín";
                    }
                    else if (checkInLocal == shiftStart)
                    {
                        checkInStatusText = $"Check-in đúng giờ lúc {checkInStr}! Bạn được cộng 1 điểm uy tín";
                    }
                    else
                    {
                        checkInStatusText = $"Check-in muộn lúc {checkInStr}! Bạn bị trừ 1 điểm uy tín";
                    }
                }
                else
                {
                    checkInStatusText = $"Check-in đúng giờ lúc {checkInStr}! Bạn được cộng 1 điểm uy tín";
                }
            }
            else if (a.Status == ApplicationStatus.NoShow)
            {
                checkInStatusText = "Bạn không đi làm hôm nay (Vắng mặt)! Bạn bị trừ 2 điểm uy tín";
            }
            else if (a.Job != null && a.Job.WorkDate.HasValue && a.Job.WorkEndTime.HasValue)
            {
                var nowVn = DateTime.UtcNow.AddHours(7);
                var shiftEnd = a.Job.WorkDate.Value.Date + a.Job.WorkEndTime.Value;
                if (nowVn > shiftEnd)
                {
                    checkInStatusText = "Bạn không đi làm hôm nay (Vắng mặt)! Bạn bị trừ 2 điểm uy tín";
                }
            }

            string? checkOutStatusText = null;
            if (a.CheckOutTime.HasValue)
            {
                var checkOutLocal = a.CheckOutTime.Value.AddHours(7);
                var checkOutStr = checkOutLocal.ToString("HH:mm");
                if (a.Job != null && a.Job.WorkDate.HasValue && a.Job.WorkEndTime.HasValue)
                {
                    var shiftEnd = a.Job.WorkDate.Value.Date + a.Job.WorkEndTime.Value;
                    if (checkOutLocal > shiftEnd)
                    {
                        checkOutStatusText = $"Check-out trễ lúc {checkOutStr}! Bạn được cộng 1 điểm uy tín";
                    }
                    else if (checkOutLocal == shiftEnd)
                    {
                        checkOutStatusText = $"Check-out đúng giờ lúc {checkOutStr}! Bạn được cộng 1 điểm uy tín";
                    }
                    else
                    {
                        checkOutStatusText = $"Check-out sớm lúc {checkOutStr}! Bạn bị trừ 1 điểm uy tín";
                    }
                }
                else
                {
                    checkOutStatusText = $"Check-out đúng giờ lúc {checkOutStr}! Bạn được cộng 1 điểm uy tín";
                }
            }
            else if (a.CheckInTime.HasValue && a.Job != null && a.Job.WorkDate.HasValue && a.Job.WorkEndTime.HasValue)
            {
                var nowVn = DateTime.UtcNow.AddHours(7);
                var shiftEnd = a.Job.WorkDate.Value.Date + a.Job.WorkEndTime.Value;
                if (nowVn > shiftEnd)
                {
                    checkOutStatusText = "Thiếu Check-out (Quên check-out)! Bạn bị trừ 1 điểm uy tín";
                }
            }

            return new ApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                JobTitle = a.Job?.Title ?? "",
                StudentId = a.StudentProfile?.UserId ?? "",
                StudentName = a.StudentProfile?.User?.FullName ?? "",
                StudentEmail = a.StudentProfile?.User?.Email,
                StudentPhone = a.StudentProfile?.User?.PhoneNumber,
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
                RejectReason = a.RejectReason,
                AppliedDate = a.AppliedDate,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,
                CheckInStatusText = checkInStatusText,
                CheckOutStatusText = checkOutStatusText,
                DisputeReason = a.DisputeReason,
                EmployerEvidenceText = a.EmployerEvidenceText,
                EmployerEvidenceUrl = a.EmployerEvidenceUrl,
                StudentEvidenceText = a.StudentEvidenceText,
                StudentEvidenceUrl = a.StudentEvidenceUrl,
                DisputedDate = a.DisputedDate
            };
        }
    }
}

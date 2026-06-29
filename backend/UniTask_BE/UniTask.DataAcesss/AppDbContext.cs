using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UniTask.DataAcesss.Entities;

namespace UniTask.DataAcesss
{
    /// <summary>
    /// DbContext chính của ứng dụng - Kế thừa IdentityDbContext để tự động tạo các bảng
    /// quản lý User, Role, Token do ASP.NET Core Identity quản lý.
    /// </summary>
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ===== Profile =====
        public DbSet<StudentProfile> StudentProfiles { get; set; }
        public DbSet<EmployerProfile> EmployerProfiles { get; set; }
        public DbSet<Company> Companies { get; set; }

        // ===== Job =====
        public DbSet<Job> Jobs { get; set; }
        public DbSet<JobRequirement> JobRequirements { get; set; }
        public DbSet<JobBenefit> JobBenefits { get; set; }
        public DbSet<JobTag> JobTags { get; set; }

        // ===== Interaction =====
        public DbSet<Application> Applications { get; set; }
        public DbSet<SavedJob> SavedJobs { get; set; }

        // ===== Financial =====
        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<Transaction> Transactions { get; set; }

        // ===== Subscription =====
        public DbSet<ServicePackage> ServicePackages { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ====================================================================
            // 1. ApplicationUser - Cấu hình quan hệ 1-1 với Profile và Wallet
            // ====================================================================
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(u => u.FullName).HasMaxLength(200).IsRequired();
                entity.Property(u => u.AvatarUrl).HasMaxLength(500);
                entity.Property(u => u.EkycFrontImageUrl).HasMaxLength(500);
                entity.Property(u => u.EkycBackImageUrl).HasMaxLength(500);

                // 1-1: User → StudentProfile
                entity.HasOne(u => u.StudentProfile)
                      .WithOne(sp => sp.User)
                      .HasForeignKey<StudentProfile>(sp => sp.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                // 1-1: User → EmployerProfile
                entity.HasOne(u => u.EmployerProfile)
                      .WithOne(ep => ep.User)
                      .HasForeignKey<EmployerProfile>(ep => ep.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                // 1-1: User → Wallet
                entity.HasOne(u => u.Wallet)
                      .WithOne(w => w.User)
                      .HasForeignKey<Wallet>(w => w.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ====================================================================
            // 2. Company
            // ====================================================================
            builder.Entity<Company>(entity =>
            {
                entity.Property(c => c.LogoUrl).HasMaxLength(500);
            });

            // ====================================================================
            // 3. EmployerProfile → Company (N-1)
            // ====================================================================
            builder.Entity<EmployerProfile>(entity =>
            {
                entity.HasOne(ep => ep.Company)
                      .WithMany(c => c.Employers)
                      .HasForeignKey(ep => ep.CompanyId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // ====================================================================
            // 4. Job - Quan hệ với Employer, Company, SelectedStudent
            // ====================================================================
            builder.Entity<Job>(entity =>
            {
                // Job → Employer (N-1)
                entity.HasOne(j => j.Employer)
                      .WithMany()
                      .HasForeignKey(j => j.EmployerId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Job → Company (N-1)
                entity.HasOne(j => j.Company)
                      .WithMany(c => c.Jobs)
                      .HasForeignKey(j => j.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);


                // Job → Requirements (1-N)
                entity.HasMany(j => j.Requirements)
                      .WithOne(r => r.Job)
                      .HasForeignKey(r => r.JobId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Job → Benefits (1-N)
                entity.HasMany(j => j.Benefits)
                      .WithOne(b => b.Job)
                      .HasForeignKey(b => b.JobId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Job → Tags (1-N)
                entity.HasMany(j => j.Tags)
                      .WithOne(t => t.Job)
                      .HasForeignKey(t => t.JobId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Index cho tìm kiếm
                entity.HasIndex(j => j.Status);
                entity.HasIndex(j => j.PostedDate);
                entity.HasIndex(j => j.CompanyId);
            });

            // ====================================================================
            // 5. Application - Sinh viên ứng tuyển Job
            // ====================================================================
            builder.Entity<Application>(entity =>
            {
                entity.HasOne(a => a.Job)
                      .WithMany(j => j.Applications)
                      .HasForeignKey(a => a.JobId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(a => a.StudentProfile)
                      .WithMany(sp => sp.Applications)
                      .HasForeignKey(a => a.StudentProfileId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Mỗi sinh viên chỉ ứng tuyển 1 lần cho mỗi job
                entity.HasIndex(a => new { a.JobId, a.StudentProfileId }).IsUnique();
            });

            // ====================================================================
            // 6. SavedJob - Sinh viên lưu Job yêu thích
            // ====================================================================
            builder.Entity<SavedJob>(entity =>
            {
                entity.HasOne(s => s.Job)
                      .WithMany(j => j.SavedByUsers)
                      .HasForeignKey(s => s.JobId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(s => s.StudentProfile)
                      .WithMany(sp => sp.SavedJobs)
                      .HasForeignKey(s => s.StudentProfileId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Mỗi sinh viên chỉ lưu 1 lần cho mỗi job
                entity.HasIndex(s => new { s.StudentProfileId, s.JobId }).IsUnique();
            });

            // ====================================================================
            // 7. Wallet → Transaction (1-N)
            // ====================================================================
            builder.Entity<Transaction>(entity =>
            {
                entity.HasOne(t => t.Wallet)
                      .WithMany(w => w.Transactions)
                      .HasForeignKey(t => t.WalletId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.RelatedJob)
                      .WithMany()
                      .HasForeignKey(t => t.RelatedJobId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(t => t.CreatedAt);
            });

            // ====================================================================
            // 8. Subscription → User & Package
            // ====================================================================
            builder.Entity<Subscription>(entity =>
            {
                entity.HasOne(s => s.User)
                      .WithMany()
                      .HasForeignKey(s => s.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(s => s.Package)
                      .WithMany(p => p.Subscriptions)
                      .HasForeignKey(s => s.PackageId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(s => new { s.UserId, s.IsActive });
            });
        }
    }
}

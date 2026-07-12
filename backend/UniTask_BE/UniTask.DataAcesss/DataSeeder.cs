using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var context = serviceProvider.GetRequiredService<AppDbContext>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // ===== 1. Seed Roles =====
            string[] roles = { "Admin", "Student", "Employer" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // ===== 1.1 Ensure Admin Exists (Hotfix) =====
            if (!await userManager.Users.AnyAsync(u => u.Email == "admin@unitask.vn"))
            {
                var admin = new ApplicationUser
                {
                    UserName = "admin@unitask.vn", Email = "admin@unitask.vn", FullName = "Admin UniTask",
                    PhoneNumber = "0900000000", UserType = UserType.Admin, EkycStatus = EkycStatus.Verified,
                    EkycDate = new DateTime(2026, 1, 1), CreatedAt = new DateTime(2026, 1, 1), EmailConfirmed = true
                };
                var result = await userManager.CreateAsync(admin, "Admin@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, "Admin");
                    context.Wallets.Add(new Wallet { UserId = admin.Id, Balance = 0 });
                    await context.SaveChangesAsync();
                }
                else
                {
                    throw new Exception("Failed to create Admin: " + string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }

            // ===== 1.2 Fix ReliabilityScore = 0 bug (Hotfix) =====
            var zeroScoreStudents = await context.StudentProfiles.Where(sp => sp.ReliabilityScore == 0).ToListAsync();
            if (zeroScoreStudents.Any())
            {
                foreach (var sp in zeroScoreStudents) sp.ReliabilityScore = 100;
                await context.SaveChangesAsync();
            }

            // ===== 2. Seed Service Packages (Dữ liệu hệ thống bắt buộc) =====
            var packages = new List<ServicePackage>
            {
                new() { Name = "Gói 3 tháng", Price = 500000, DurationMonths = 3, Description = "Đăng tuyển không giới hạn trong 3 tháng" },
                new() { Name = "Gói 6 tháng", Price = 1029000, DurationMonths = 6, Description = "Đăng tuyển không giới hạn trong 6 tháng + ưu tiên hiển thị" },
                new() { Name = "Gói 12 tháng", Price = 1399000, DurationMonths = 12, Description = "Đăng tuyển không giới hạn + ưu tiên hiển thị + badge Premium" },
            };
            if (!await context.ServicePackages.AnyAsync())
            {
                context.ServicePackages.AddRange(packages);
                await context.SaveChangesAsync();
            }

        // ===== 3. Gọi MockDataSeeder để sinh 50 Users mới =====
        await MockDataSeeder.SeedMockDataAsync(serviceProvider);

        // ===== 4. Gọi NewStudentSeeder để sinh thêm 100 Users sinh viên mới =====
        await NewStudentSeeder.SeedStudentsAsync(serviceProvider);
    }
}
}

using Bogus;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss
{
    public static class MockDataSeeder
    {
        public static async Task SeedMockDataAsync(IServiceProvider serviceProvider)
        {
            var context = serviceProvider.GetRequiredService<AppDbContext>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // Ensure roles exist
            string[] roles = { "Student", "Employer" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // Check if mock data already exists (by checking user count)
            if (await context.Users.CountAsync() >= 10)
            {
                return; // Already seeded with mock or real users
            }

            Randomizer.Seed = new Random(2026);
            var password = "Demo@2026";
            var usedEmails = new HashSet<string>();

            string RemoveDiacritics(string text)
            {
                var normalizedString = text.Normalize(System.Text.NormalizationForm.FormD);
                var stringBuilder = new System.Text.StringBuilder();

                foreach (var c in normalizedString)
                {
                    var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                    if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                    {
                        stringBuilder.Append(c);
                    }
                }

                return stringBuilder.ToString().Normalize(System.Text.NormalizationForm.FormC).Replace("đ", "d").Replace("Đ", "D");
            }

            string CreateUniqueEmail(string fullName)
            {
                var noAccents = RemoveDiacritics(fullName).ToLower();
                var cleanName = System.Text.RegularExpressions.Regex.Replace(noAccents, @"[^a-z0-9]", "");
                var email = $"{cleanName}@gmail.com";
                int counter = 1;
                while (usedEmails.Contains(email))
                {
                    email = $"{cleanName}{counter}@gmail.com";
                    counter++;
                }
                usedEmails.Add(email);
                return email;
            }

            // 1. Generate 10 Companies
            var companyFaker = new Faker<Company>("vi")
                .RuleFor(c => c.Name, f => f.Company.CompanyName())
                .RuleFor(c => c.Industry, f => f.PickRandom("IT", "Marketing", "Sự kiện", "F&B", "Bán lẻ", "Giáo dục"))
                .RuleFor(c => c.Size, f => f.PickRandom("1-10", "10-50", "50-100"))
                .RuleFor(c => c.Location, f => f.Address.City())
                .RuleFor(c => c.Description, f => f.Lorem.Paragraph())
                .RuleFor(c => c.Website, f => f.Internet.Url())
                .RuleFor(c => c.Rating, f => f.Random.Decimal(4.0m, 5.0m))
                .RuleFor(c => c.IsVerified, true);

            var companies = companyFaker.Generate(10);
            context.Companies.AddRange(companies);
            await context.SaveChangesAsync();

            // 2. Generate 10 Employers
            var employers = new List<ApplicationUser>();
            var employerFaker = new Faker<ApplicationUser>("vi")
                .RuleFor(u => u.FullName, f => f.Name.FullName())
                .RuleFor(u => u.UserName, (f, u) => CreateUniqueEmail(u.FullName))
                .RuleFor(u => u.Email, (f, u) => u.UserName)
                .RuleFor(u => u.PhoneNumber, f => f.Phone.PhoneNumber("09########"))
                .RuleFor(u => u.UserType, UserType.Employer)
                .RuleFor(u => u.EkycStatus, EkycStatus.Verified)
                .RuleFor(u => u.EkycDate, f => f.Date.Past(1, new DateTime(2026, 7, 1)))
                .RuleFor(u => u.CreatedAt, f => f.Date.Past(1, new DateTime(2026, 7, 1)))
                .RuleFor(u => u.EmailConfirmed, true);

            for (int i = 0; i < 10; i++)
            {
                var employer = employerFaker.Generate();
                var result = await userManager.CreateAsync(employer, password);
                if (!result.Succeeded) throw new Exception("Failed to create Employer: " + string.Join(", ", result.Errors.Select(e => e.Description)));
                await userManager.AddToRoleAsync(employer, "Employer");
                employers.Add(employer);

                context.EmployerProfiles.Add(new EmployerProfile
                {
                    UserId = employer.Id,
                    CompanyId = companies[i].Id,
                    Position = "HR Manager",
                    BusinessLicenseUrl = "https://example.com/license.jpg",
                    IsBusinessLicenseVerified = true
                });
                
                context.Wallets.Add(new Wallet { UserId = employer.Id, Balance = 0 });
            }
            await context.SaveChangesAsync();

            // 3. Generate 40 Students
            var students = new List<ApplicationUser>();
            var studentFaker = new Faker<ApplicationUser>("vi")
                .RuleFor(u => u.FullName, f => f.Name.FullName())
                .RuleFor(u => u.UserName, (f, u) => CreateUniqueEmail(u.FullName))
                .RuleFor(u => u.Email, (f, u) => u.UserName)
                .RuleFor(u => u.PhoneNumber, f => f.Phone.PhoneNumber("03########"))
                .RuleFor(u => u.UserType, UserType.Student)
                .RuleFor(u => u.EkycStatus, EkycStatus.Verified)
                .RuleFor(u => u.EkycDate, f => f.Date.Past(1, new DateTime(2026, 7, 1)))
                .RuleFor(u => u.CreatedAt, f => f.Date.Past(1, new DateTime(2026, 7, 1)))
                .RuleFor(u => u.EmailConfirmed, true);

            var studentProfileFaker = new Faker<StudentProfile>("vi")
                .RuleFor(p => p.University, f => f.PickRandom("Đại học FPT", "Đại học Bách Khoa", "Đại học Kinh Tế", "Đại học Ngoại Thương", "RMIT"))
                .RuleFor(p => p.Major, f => f.PickRandom("CNTT", "Kinh doanh", "Marketing", "Thiết kế đồ họa"))
                .RuleFor(p => p.Year, f => f.Random.Int(1, 4))
                .RuleFor(p => p.GPA, f => f.Random.Decimal(2.5m, 4.0m))
                .RuleFor(p => p.Skills, "[\"Giao tiếp\", \"Tiếng Anh\", \"Làm việc nhóm\"]")
                .RuleFor(p => p.Bio, f => f.Lorem.Sentence())
                .RuleFor(p => p.Address, f => f.Address.City())
                .RuleFor(p => p.DateOfBirth, f => f.Date.Past(5, new DateTime(2005, 1, 1)))
                .RuleFor(p => p.ReliabilityScore, 100);

            for (int i = 0; i < 40; i++)
            {
                var student = studentFaker.Generate();
                var result = await userManager.CreateAsync(student, password);
                if (!result.Succeeded) throw new Exception("Failed to create Student: " + string.Join(", ", result.Errors.Select(e => e.Description)));
                await userManager.AddToRoleAsync(student, "Student");
                students.Add(student);

                var profile = studentProfileFaker.Generate();
                profile.UserId = student.Id;
                context.StudentProfiles.Add(profile);

                context.Wallets.Add(new Wallet { UserId = student.Id, Balance = 0 });
            }
            await context.SaveChangesAsync();

            // 4. Generate 20-30 Expired Jobs
            var jobTemplates = new[] {
                new { Title = "Thực tập sinh Marketing / Content Creator", Category = "Marketing & Content", Tags = new[] { "Marketing", "Sinh viên", "Content" } },
                new { Title = "Nhân viên Telesales (Part-time)", Category = "Sales", Tags = new[] { "Sales", "Bán thời gian", "Sinh viên" } },
                new { Title = "Cộng tác viên viết bài PR", Category = "Marketing & Content", Tags = new[] { "Freelance", "Viết lách" } },
                new { Title = "Thực tập sinh Lập trình Web (Frontend)", Category = "IT & Công nghệ", Tags = new[] { "IT", "Thực tập", "Frontend" } },
                new { Title = "Nhân viên hỗ trợ sự kiện", Category = "Sự kiện", Tags = new[] { "Sự kiện", "Part-time" } },
                new { Title = "Designer thực tập (Photoshop/Illustrator)", Category = "Thiết kế & Đồ họa", Tags = new[] { "Thiết kế", "Đồ họa", "Sinh viên" } },
                new { Title = "Nhân viên nhập liệu bán thời gian", Category = "Hành chính", Tags = new[] { "Nhập liệu", "Bán thời gian", "Sinh viên" } }
            };

            var jobDescriptions = new[] {
                "Mô tả công việc:\n- Quản lý và lên nội dung cho Fanpage.\n- Hỗ trợ quay dựng video cơ bản.\nYêu cầu:\n- Sinh viên năm 2 trở lên.\n- Có khả năng viết lách tốt.\nQuyền lợi:\n- Được đào tạo bài bản.\n- Hỗ trợ dấu mộc thực tập.",
                "Mô tả công việc:\n- Gọi điện tư vấn khóa học cho khách hàng theo data có sẵn.\n- Cập nhật thông tin lên hệ thống.\nYêu cầu:\n- Giọng nói dễ nghe, không ngọng.\n- Có laptop cá nhân.\nQuyền lợi:\n- Lương cứng + Hoa hồng.\n- Thời gian làm việc linh hoạt.",
                "Mô tả công việc:\n- Phối hợp cùng team để triển khai giao diện người dùng trên nền tảng Web.\n- Xử lý lỗi và tối ưu hiệu suất.\nYêu cầu:\n- Nắm vững HTML, CSS, JavaScript.\n- Có tinh thần học hỏi cao.\nQuyền lợi:\n- Có lương thực tập.\n- Xem xét lên chính thức sau 2 tháng."
            };

            var jobFaker = new Faker<Job>("vi")
                .RuleFor(j => j.Location, f => f.Address.City())
                .RuleFor(j => j.Type, f => f.PickRandom("Freelance", "Part-time", "Thực tập"))
                .RuleFor(j => j.SalaryText, f => f.Random.Int(100, 500) + "k/buổi")
                .RuleFor(j => j.Budget, f => f.Random.Int(200000, 1000000))
                .RuleFor(j => j.Commission, (f, j) => j.Budget * 0.1m)
                .RuleFor(j => j.PostedDate, f => f.Date.Between(new DateTime(2026, 5, 1), new DateTime(2026, 6, 15)))
                .RuleFor(j => j.Deadline, (f, j) => j.PostedDate.AddDays(f.Random.Int(5, 15)))
                .RuleFor(j => j.Views, f => f.Random.Int(100, 1000))
                .RuleFor(j => j.ApplicationsCount, f => f.Random.Int(5, 20))
                .RuleFor(j => j.IsUrgent, f => f.Random.Bool())
                .RuleFor(j => j.IsRemote, f => f.Random.Bool())
                .RuleFor(j => j.Status, f => f.PickRandom(JobStatus.Closed, JobStatus.Completed));

            foreach (var employer in employers)
            {
                var employerProfile = await context.EmployerProfiles.FirstAsync(e => e.UserId == employer.Id);
                
                int numJobs = Randomizer.Seed.Next(2, 4);
                for (int i = 0; i < numJobs; i++)
                {
                    var job = jobFaker.Generate();
                    var template = jobTemplates[Randomizer.Seed.Next(jobTemplates.Length)];
                    
                    job.Title = template.Title;
                    job.Category = template.Category;
                    job.Description = jobDescriptions[Randomizer.Seed.Next(jobDescriptions.Length)];
                    job.EmployerId = employer.Id;
                    job.CompanyId = employerProfile.CompanyId.Value;
                    
                    context.Jobs.Add(job);
                    await context.SaveChangesAsync(); 

                    foreach (var tag in template.Tags)
                    {
                        context.JobTags.Add(new JobTag { JobId = job.Id, TagName = tag });
                    }
                    
                    context.JobRequirements.Add(new JobRequirement { JobId = job.Id, Content = "Tinh thần trách nhiệm cao" });
                    context.JobRequirements.Add(new JobRequirement { JobId = job.Id, Content = "Chăm chỉ, trung thực" });
                    context.JobBenefits.Add(new JobBenefit { JobId = job.Id, Content = "Môi trường làm việc năng động" });
                    context.JobBenefits.Add(new JobBenefit { JobId = job.Id, Content = "Cơ hội thăng tiến và học hỏi" });
                }
            }
            await context.SaveChangesAsync();
        }
    }
}

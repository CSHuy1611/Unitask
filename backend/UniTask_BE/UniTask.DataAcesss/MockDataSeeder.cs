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
            
            // Generate 2 specific Enterprise Employers
            for (int i = 1; i <= 2; i++)
            {
                var enterprise = new ApplicationUser
                {
                    FullName = $"Doanh nghiệp {i}",
                    UserName = $"doanhnghiep{i}@gmail.com",
                    Email = $"doanhnghiep{i}@gmail.com",
                    PhoneNumber = $"098765432{i}",
                    UserType = UserType.Employer,
                    EkycStatus = EkycStatus.Verified,
                    EkycDate = DateTime.UtcNow.AddDays(-10),
                    CreatedAt = DateTime.UtcNow.AddDays(-20),
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(enterprise, password);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(enterprise, "Employer");
                    employers.Add(enterprise);

                    var newCompany = new Company
                    {
                        Name = $"Công ty TNHH Doanh nghiệp {i}",
                        Industry = "CNTT",
                        Size = "100-500",
                        Location = "Hà Nội",
                        Description = "Công ty công nghệ hàng đầu.",
                        Website = $"https://doanhnghiep{i}.com",
                        Rating = 4.8m,
                        IsVerified = true
                    };
                    context.Companies.Add(newCompany);
                    await context.SaveChangesAsync();

                    context.EmployerProfiles.Add(new EmployerProfile
                    {
                        UserId = enterprise.Id,
                        CompanyId = newCompany.Id,
                        Position = "Giám đốc",
                        BusinessLicenseUrl = "https://example.com/license.jpg",
                        IsBusinessLicenseVerified = true,
                        Type = EmployerType.Business
                    });
                    
                    context.Wallets.Add(new Wallet { UserId = enterprise.Id, Balance = 5000000 });
                }
            }
            await context.SaveChangesAsync();

            // 3. Generate 50 Students
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

            for (int i = 0; i < 50; i++)
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
            // 4. Generate 20-30 Realistic Short-term Jobs (Household / Freelance)
            var jobTemplates = new[] {
                new { 
                    Title = "Nhân viên bê tráp đám cưới (Nam/Nữ)", 
                    Category = "Sự kiện", 
                    Tags = new[] { "Bê tráp", "Cuối tuần", "Sinh viên" },
                    Description = "Cần tuyển 5 bạn nam và 5 bạn nữ hỗ trợ bê tráp đám hỏi. Thời gian làm việc ngắn, phù hợp với sinh viên kiếm thêm thu nhập cuối tuần.",
                    SalaryText = "150k - 200k/buổi",
                    Requirements = new[] { "Nam cao > 1m65, Nữ cao > 1m55", "Ngoại hình sáng sủa, gọn gàng", "Đúng giờ, có mặt trước 30 phút", "Thái độ vui vẻ, nhiệt tình" },
                    Benefits = new[] { "Nhận lương ngay sau khi xong việc", "Được phát lì xì duyên", "Hỗ trợ trang phục áo dài/áo sơ mi" }
                },
                new { 
                    Title = "Shipper Giao Hàng Hỏa Tốc Nội Thành", 
                    Category = "Vận chuyển", 
                    Tags = new[] { "Giao hàng", "Shipper", "Linh hoạt" },
                    Description = "Shop kinh doanh hoa quả nhập khẩu cần tuyển shipper ruột chạy các đơn hỏa tốc nội thành. Đơn nổ liên tục trong ngày, có thể chọn thời gian rảnh để chạy.",
                    SalaryText = "20k - 35k/đơn",
                    Requirements = new[] { "Có xe máy cá nhân và smartphone", "Thông thuộc đường phố", "Nhanh nhẹn, cẩn thận, bảo quản hàng tốt (hoa quả)", "Thái độ lịch sự với khách hàng" },
                    Benefits = new[] { "Thu nhập trung bình 200k-400k/ngày nếu chạy chăm chỉ", "Không cần cọc tiền hàng với các đơn dưới 500k", "Thời gian linh hoạt, rảnh lúc nào chạy lúc đó" }
                },
                new { 
                    Title = "Quay và Dựng Video TikTok (Freelance)", 
                    Category = "Marketing & Content", 
                    Tags = new[] { "TikTok", "Quay phim", "Edit video" },
                    Description = "Shop thời trang cần tìm bạn sinh viên có năng khiếu quay dựng video TikTok, Reels để quảng bá sản phẩm mới. Có kịch bản sẵn, chỉ cần đến shop quay 1 buổi và dựng 3-5 video ngắn.",
                    SalaryText = "300k - 500k/buổi",
                    Requirements = new[] { "Có kỹ năng sử dụng CapCut hoặc Premiere", "Có mắt thẩm mỹ, bắt trend TikTok nhanh", "Có điện thoại quay phim tốt hoặc máy ảnh", "Hoàn thành video đúng deadline (2 ngày sau khi quay)" },
                    Benefits = new[] { "Thời gian làm việc cực kỳ linh hoạt", "Thanh toán ngay 50% sau khi quay xong", "Có thể hợp tác lâu dài nếu sản phẩm chất lượng tốt" }
                },
                new { 
                    Title = "Phục vụ tiệc cưới cuối tuần (Part-time)", 
                    Category = "F&B", 
                    Tags = new[] { "Phục vụ", "Nhà hàng", "Cuối tuần" },
                    Description = "Nhà hàng tiệc cưới cần tuyển gấp nhân viên phục vụ part-time làm việc vào các ngày cuối tuần (Thứ 7, Chủ Nhật). Công việc bao gồm setup bàn tiệc, lên món và dọn dẹp.",
                    SalaryText = "120k - 180k/ca",
                    Requirements = new[] { "Sức khỏe tốt, nhanh nhẹn", "Trang phục áo sơ mi trắng, quần tây đen, giày đen", "Thái độ phục vụ chuyên nghiệp, chu đáo", "Chưa có kinh nghiệm sẽ được hướng dẫn" },
                    Benefits = new[] { "Bao ăn 1 bữa theo ca làm việc", "Có cơ hội nhận tiền tip từ khách", "Môi trường làm việc nhộn nhịp, nhiều bạn bè đồng trang lứa" }
                },
                new { 
                    Title = "Phát tờ rơi khai trương quán Cafe", 
                    Category = "Marketing & Content", 
                    Tags = new[] { "Phát tờ rơi", "Khai trương", "Part-time" },
                    Description = "Quán Cafe mới khai trương cần tìm các bạn sinh viên năng động hỗ trợ phát tờ rơi tại các ngã tư và cổng trường đại học khu vực lân cận.",
                    SalaryText = "30k/giờ",
                    Requirements = new[] { "Chịu khó, không ngại nắng nôi", "Đứng phát tại đúng các điểm được phân công", "Vui vẻ, tươi tắn khi giao tờ rơi cho khách", "Nộp lại hình ảnh check-in tại điểm phát" },
                    Benefits = new[] { "Nhận lương ngay trong ngày", "Tặng 1 ly nước uống tự chọn miễn phí sau ca làm", "Ca làm việc ngắn (2-3 tiếng/ca), không gò bó" }
                },
                new { 
                    Title = "Hỗ trợ gói quà sự kiện 8/3", 
                    Category = "Hành chính", 
                    Tags = new[] { "Gói quà", "Thủ công", "Thời vụ" },
                    Description = "Cửa hàng quà tặng cần tuyển nhân viên thời vụ hỗ trợ gói quà (hoa, mỹ phẩm) dịp lễ mùng 8/3 đang tới gần. Số lượng đơn hàng lớn nên cần người khéo tay.",
                    SalaryText = "25k/giờ",
                    Requirements = new[] { "Khéo tay, tỉ mỉ, cẩn thận", "Nhanh nhẹn, có thể làm việc dưới áp lực thời gian", "Ưu tiên các bạn nữ đã từng làm đồ handmade", "Có thể làm tăng ca nếu cần" },
                    Benefits = new[] { "Công việc nhẹ nhàng, ngồi máy lạnh", "Làm tốt có thưởng thêm theo số lượng đơn hoàn thành", "Được mua sản phẩm tại shop với giá ưu đãi" }
                }
            };

            var jobFaker = new Faker<Job>("vi")
                .RuleFor(j => j.Location, f => f.Address.City())
                .RuleFor(j => j.Type, f => f.PickRandom("Freelance", "Part-time", "Thời vụ"))
                .RuleFor(j => j.Budget, f => f.Random.Int(100000, 800000))
                .RuleFor(j => j.Commission, (f, j) => j.Budget * 0.1m)
                .RuleFor(j => j.PostedDate, f => f.Date.Between(new DateTime(2026, 5, 1), new DateTime(2026, 6, 15)))
                .RuleFor(j => j.Deadline, (f, j) => j.PostedDate.AddDays(f.Random.Int(3, 10)))
                .RuleFor(j => j.Views, f => f.Random.Int(50, 500))
                .RuleFor(j => j.ApplicationsCount, f => f.Random.Int(2, 15))
                .RuleFor(j => j.IsUrgent, f => f.Random.Bool())
                .RuleFor(j => j.IsRemote, f => f.Random.Bool())
                .RuleFor(j => j.Status, f => f.PickRandom(JobStatus.Closed, JobStatus.Completed));

            foreach (var employer in employers)
            {
                var employerProfile = await context.EmployerProfiles.FirstAsync(e => e.UserId == employer.Id);
                
                int numJobs = Randomizer.Seed.Next(1, 4);
                for (int i = 0; i < numJobs; i++)
                {
                    var job = jobFaker.Generate();
                    var template = jobTemplates[Randomizer.Seed.Next(jobTemplates.Length)];
                    
                    job.Title = template.Title;
                    job.Category = template.Category;
                    job.Description = template.Description;
                    job.SalaryText = template.SalaryText;
                    job.EmployerId = employer.Id;
                    job.CompanyId = employerProfile.CompanyId.Value;
                    
                    context.Jobs.Add(job);
                    await context.SaveChangesAsync(); 

                    foreach (var tag in template.Tags)
                    {
                        context.JobTags.Add(new JobTag { JobId = job.Id, TagName = tag });
                    }
                    
                    foreach (var req in template.Requirements)
                    {
                        context.JobRequirements.Add(new JobRequirement { JobId = job.Id, Content = req });
                    }
                    
                    foreach (var ben in template.Benefits)
                    {
                        context.JobBenefits.Add(new JobBenefit { JobId = job.Id, Content = ben });
                    }
                }
            }
            await context.SaveChangesAsync();
        }
    }
}

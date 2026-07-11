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

            // 1. Generate 10 Specific Household Companies (Hộ Kinh Doanh)
            var householdData = new[]
            {
                new { Tax = "8122887619-001", Name = "HỘ KINHH DOANH QUẢNG CÁO 365HL", Desc = "Quay video quảng cáo, thiết kế/quảng cáo local, content marketing. Trạng thái đang hoạt động, địa chỉ thuế Thôn 3, Xã Hòa Lạc." },
                new { Tax = "8716585280-001", Name = "HỘ KINH DOANH QUÁN SỮA 338", Desc = "Review đồ uống, quay video quán, TikTok/Facebook content. Trạng thái đang hoạt động, địa chỉ thuế Thôn 1, Xã Hòa Lạc." },
                new { Tax = "0107617853", Name = "HỘ KINH DOANH HƯƠNG VIỆT QUÁN", Desc = "Review quán ăn, quay món ăn, phục vụ part-time. Trạng thái đang hoạt động, địa chỉ Thôn 2, Xã Thạch Hoà." },
                new { Tax = "8779182598-001", Name = "HỘ KINH DOANH OHIO MART", Desc = "Review siêu thị/mini mart, quay video sản phẩm, bán hàng part-time. Trạng thái đang hoạt động, địa chỉ thuế Thôn 3, Xã Hòa Lạc." },
                new { Tax = "8148376746-001", Name = "HỘ KINH DOANH MỸ PHẨM HÒA LẠC", Desc = "Mẫu ảnh mỹ phẩm, review sản phẩm, quay video quảng cáo sản phẩm. Trạng thái đang hoạt động, địa chỉ thuế Thôn 4, Xã Hòa Lạc." },
                new { Tax = "001091051569", Name = "HỘ KINH DOANH MỸ PHẨM HÒA LẠC", Desc = "Mẫu ảnh/reviewer mỹ phẩm, content TikTok sản phẩm. Trạng thái đang hoạt động, địa chỉ thuế Thôn 4, Xã Hòa Lạc." },
                new { Tax = "8441168811-001", Name = "HỘ KINH DOANH DI ĐỘNG HÒA LẠC", Desc = "Review điện thoại/phụ kiện, quay video giới thiệu sản phẩm. Trạng thái đang hoạt động, địa chỉ thuế Thôn 3, Xã Hòa Lạc." },
                new { Tax = "0102905939-001", Name = "CHUNG CƯ MINI 68", Desc = "Quay video quảng cáo phòng trọ/chung cư mini, content review địa điểm. Trạng thái đang hoạt động, địa chỉ thuế Cụm 4, Xã Hòa Lạc." },
                new { Tax = "8095833587-001", Name = "HỘ KINH DOANH TÂY ĐÔ HOÀ LẠC", Desc = "Quay video cửa hàng/dịch vụ địa phương, content giới thiệu cơ sở. Trạng thái đang hoạt động, địa chỉ thuế Thôn 2, Xã Hòa Lạc." },
                new { Tax = "8659772690-001", Name = "HỘ KINH DOANH PHONG NHÀN", Desc = "Content quảng cáo hộ kinh doanh địa phương, quay clip giới thiệu dịch vụ. Trạng thái đang hoạt động, địa chỉ thuế Thôn 4, Xã Hòa Lạc." }
            };

            var companies = householdData.Select(h => new Company
            {
                Name = h.Name,
                TaxCode = h.Tax,
                Description = h.Desc,
                Industry = "Dịch vụ địa phương",
                Size = "1-10",
                Location = h.Desc.Contains("Hòa Lạc") ? "Hòa Lạc" : "Thạch Hoà",
                Website = "https://masothue.com",
                Rating = 5.0m,
                IsVerified = true
            }).ToList();

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
                    
                    context.Wallets.Add(new Wallet { UserId = enterprise.Id, Balance = 0 });
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
            // 4. Generate Customized Jobs for each Employer based on their Company
            var jobFaker = new Faker<Job>("vi")
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
                var employerProfile = await context.EmployerProfiles.Include(e => e.Company).FirstAsync(e => e.UserId == employer.Id);
                var companyName = employerProfile.Company?.Name ?? "";
                
                int numJobs = Randomizer.Seed.Next(1, 4);
                for (int i = 0; i < numJobs; i++)
                {
                    var job = jobFaker.Generate();
                    job.Location = employerProfile.Company?.Location ?? "Hà Nội";
                    
                    // Match templates based on Company Name
                    if (companyName.Contains("QUẢNG CÁO 365HL"))
                    {
                        job.Title = "Quay video quảng cáo sản phẩm local";
                        job.Category = "Marketing & Content";
                        job.Description = "Tuyển người quay video bằng điện thoại tại cửa hàng để chạy Ads Facebook. Cần biết căn góc và có sẵn kịch bản quay ngắn.";
                        job.SalaryText = "200k - 300k/buổi";
                        job.Location = "Thôn 3, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Quay phim"}, new JobTag{TagName="TikTok"}, new JobTag{TagName="Freelance"} };
                    }
                    else if (companyName.Contains("QUÁN SỮA 338"))
                    {
                        job.Title = "Review đồ uống tại quán (Đăng TikTok)";
                        job.Category = "Marketing & Content";
                        job.Description = "Cần 1 bạn sinh viên ngoại hình sáng đến quán review 2 món đồ uống mới, quay và đăng lên kênh TikTok cá nhân.";
                        job.SalaryText = "150k + Đồ uống free";
                        job.Location = "Thôn 1, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Reviewer"}, new JobTag{TagName="F&B"} };
                    }
                    else if (companyName.Contains("HƯƠNG VIỆT QUÁN"))
                    {
                        job.Title = "Phục vụ bàn part-time cuối tuần";
                        job.Category = "F&B";
                        job.Description = "Quán đông khách dịp cuối tuần, cần tuyển 2 bạn phục vụ bàn, order món ăn và dọn dẹp nhẹ nhàng.";
                        job.SalaryText = "25k/giờ";
                        job.Location = "Thôn 2, Xã Thạch Hoà";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Phục vụ"}, new JobTag{TagName="Part-time"} };
                    }
                    else if (companyName.Contains("OHIO MART"))
                    {
                        job.Title = "Bán hàng siêu thị mini ca tối";
                        job.Category = "Bán lẻ";
                        job.Description = "Đứng quầy thu ngân và sắp xếp hàng hóa siêu thị mini ca từ 18h - 22h.";
                        job.SalaryText = "22k/giờ";
                        job.Location = "Thôn 3, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Bán hàng"}, new JobTag{TagName="Thu ngân"} };
                    }
                    else if (companyName.Contains("MỸ PHẨM"))
                    {
                        job.Title = "Mẫu ảnh chụp feedback mỹ phẩm";
                        job.Category = "Sáng tạo nội dung";
                        job.Description = "Tuyển mẫu ảnh nữ chụp cùng set mỹ phẩm skincare mới nhập. Chụp tại studio của shop.";
                        job.SalaryText = "300k/buổi";
                        job.Location = "Thôn 4, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Mẫu ảnh"}, new JobTag{TagName="Mỹ phẩm"} };
                    }
                    else if (companyName.Contains("DI ĐỘNG"))
                    {
                        job.Title = "Quay video unbox và review điện thoại";
                        job.Category = "Công nghệ";
                        job.Description = "Cửa hàng cần tuyển 1 bạn có khả năng nói lưu loát để quay video unbox các mẫu điện thoại mới nhất đăng lên Fanpage.";
                        job.SalaryText = "250k - 400k/buổi";
                        job.Location = "Thôn 3, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Review"}, new JobTag{TagName="Tech"} };
                    }
                    else if (companyName.Contains("CHUNG CƯ MINI"))
                    {
                        job.Title = "Phát tờ rơi quảng cáo phòng trọ mới xây";
                        job.Category = "Marketing";
                        job.Description = "Chung cư mini mới khai trương cần 3 bạn phát tờ rơi tại ngã tư và cổng trường đại học lân cận.";
                        job.SalaryText = "30k/giờ";
                        job.Location = "Cụm 4, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Phát tờ rơi"}, new JobTag{TagName="Part-time"} };
                    }
                    else if (companyName.Contains("TÂY ĐÔ"))
                    {
                        job.Title = "Shipper giao hàng nội khu Hòa Lạc";
                        job.Category = "Vận chuyển";
                        job.Description = "Cần 1 bạn có xe máy chạy ship đồ ăn nội khu vực Hòa Lạc. Đơn nổ liên tục buổi trưa và tối.";
                        job.SalaryText = "15k - 25k/đơn";
                        job.Location = "Thôn 2, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Shipper"}, new JobTag{TagName="Giao hàng"} };
                    }
                    else if (companyName.Contains("PHONG NHÀN"))
                    {
                        job.Title = "Nhân viên bê tráp đám hỏi (Nam/Nữ)";
                        job.Category = "Sự kiện";
                        job.Description = "Dịch vụ cưới hỏi Phong Nhàn cần gấp 5 bạn nam và 5 bạn nữ đi bê tráp cuối tuần này.";
                        job.SalaryText = "150k - 200k/buổi";
                        job.Location = "Thôn 4, Xã Hòa Lạc";
                        job.Tags = new List<JobTag> { new JobTag{TagName="Bê tráp"}, new JobTag{TagName="Cuối tuần"} };
                    }
                    else
                    {
                        job.Title = "Lập trình viên ReactJS (Freelance)";
                        job.Category = "IT";
                        job.Description = "Bảo trì và thêm tính năng mới cho Landing Page của công ty.";
                        job.SalaryText = "2 triệu - 5 triệu/project";
                        job.Tags = new List<JobTag> { new JobTag{TagName="IT"}, new JobTag{TagName="ReactJS"} };
                    }

                    job.EmployerId = employer.Id;
                    job.CompanyId = employerProfile.CompanyId.Value;
                    
                    job.Requirements = new List<JobRequirement> 
                    { 
                        new JobRequirement { Content = "Trách nhiệm, nhiệt tình với công việc" },
                        new JobRequirement { Content = "Đúng giờ, tuân thủ quy định" }
                    };
                    
                    job.Benefits = new List<JobBenefit>
                    {
                        new JobBenefit { Content = "Môi trường làm việc thoải mái" },
                        new JobBenefit { Content = "Thanh toán lương đúng hạn" }
                    };

                    context.Jobs.Add(job);
                }
            }
            await context.SaveChangesAsync();
        }
    }
}

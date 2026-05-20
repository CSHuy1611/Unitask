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

            // Skip if already seeded
            if (await context.Companies.AnyAsync()) return;

            // ===== 1. Seed Roles =====
            string[] roles = { "Admin", "Student", "Employer" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // ===== 2. Seed Companies =====
            var companies = new List<Company>
            {
                new() { Name = "Studio Ánh Sáng", Industry = "Studio chụp ảnh / Nhiếp ảnh", Size = "5-10 nhân viên", Location = "TP. Hồ Chí Minh", Description = "Studio chụp ảnh chuyên nghiệp tại TP.HCM, chuyên lookbook thời trang, ảnh cưới, ảnh sự kiện.", Website = "#", Rating = 4.8m, IsVerified = true },
                new() { Name = "Makeup Artist Linh Nguyễn", Industry = "Makeup / Làm đẹp", Size = "Cá nhân", Location = "Hà Nội", Description = "Chuyên gia trang điểm với 5 năm kinh nghiệm.", Website = "#", Rating = 4.9m, IsVerified = true },
                new() { Name = "Wedding House Việt", Industry = "Dịch vụ cưới hỏi", Size = "10-20 nhân viên", Location = "TP. Hồ Chí Minh, Hà Nội", Description = "Dịch vụ tổ chức đám cưới trọn gói.", Website = "#", Rating = 4.7m, IsVerified = true },
                new() { Name = "Shop Mây Fashion", Industry = "Thời trang / Bán lẻ", Size = "3-5 nhân viên", Location = "Đà Nẵng", Description = "Shop thời trang nữ online và offline tại Đà Nẵng.", Website = "#", Rating = 4.5m, IsVerified = true },
                new() { Name = "Tiệm Hoa Cỏ May", Industry = "Hoa tươi / Quà tặng", Size = "Cá nhân / 2-3 người", Location = "Remote", Description = "Tiệm hoa tươi online, bán trên Shopee và TikTok Shop.", Website = "#", Rating = 4.6m, IsVerified = true },
                new() { Name = "Mimu Accessories", Industry = "Phụ kiện handmade", Size = "Cá nhân", Location = "Remote", Description = "Thương hiệu phụ kiện handmade bán online.", Website = "#", Rating = 4.4m, IsVerified = true },
                new() { Name = "BeautyBox VN", Industry = "Mỹ phẩm / KOC Marketing", Size = "5-10 nhân viên", Location = "Remote", Description = "Thương hiệu mỹ phẩm Việt Nam, marketing qua KOC.", Website = "#", Rating = 4.3m, IsVerified = true },
                new() { Name = "Nhà hàng Hoa Sen", Industry = "Nhà hàng / Tiệc cưới", Size = "20-50 nhân viên", Location = "Hà Nội", Description = "Nhà hàng tiệc cưới hàng đầu tại Hà Nội.", Website = "#", Rating = 4.5m, IsVerified = true },
            };
            context.Companies.AddRange(companies);
            await context.SaveChangesAsync();

            // Get companies for reference
            var studioAnhSang = await context.Companies.FirstAsync(c => c.Name == "Studio Ánh Sáng");
            var makeupLinhNguyen = await context.Companies.FirstAsync(c => c.Name == "Makeup Artist Linh Nguyễn");
            var weddingHouse = await context.Companies.FirstAsync(c => c.Name == "Wedding House Việt");
            var shopMay = await context.Companies.FirstAsync(c => c.Name == "Shop Mây Fashion");
            var tiemHoa = await context.Companies.FirstAsync(c => c.Name == "Tiệm Hoa Cỏ May");
            var mimu = await context.Companies.FirstAsync(c => c.Name == "Mimu Accessories");
            var beautyBox = await context.Companies.FirstAsync(c => c.Name == "BeautyBox VN");
            var nhaHang = await context.Companies.FirstAsync(c => c.Name == "Nhà hàng Hoa Sen");

            // ===== 3. Seed Users =====
            // Student 1
            var student1 = new ApplicationUser
            {
                UserName = "student@unitask.vn", Email = "student@unitask.vn", FullName = "Nguyễn Thị Minh Anh",
                PhoneNumber = "0901234567", UserType = UserType.Student, EkycStatus = EkycStatus.Verified,
                EkycDate = new DateTime(2026, 2, 15), CreatedAt = new DateTime(2026, 1, 10), EmailConfirmed = true
            };
            await userManager.CreateAsync(student1, "123456");
            await userManager.AddToRoleAsync(student1, "Student");

            context.StudentProfiles.Add(new StudentProfile
            {
                UserId = student1.Id, University = "Đại học FPT", Major = "Truyền thông đa phương tiện",
                Year = 3, GPA = 3.5m, Skills = "[\"Mẫu ảnh\",\"Makeup cơ bản\",\"Canva\",\"TikTok Content\",\"MC sự kiện\"]",
                Bio = "Sinh viên năm 3, từng làm mẫu ảnh lookbook và bê tráp cuối tuần.",
                Address = "Quận 9, TP. Hồ Chí Minh", DateOfBirth = new DateTime(2004, 5, 12)
            });
            context.Wallets.Add(new Wallet { UserId = student1.Id, Balance = 0 });

            // Student 2
            var student2 = new ApplicationUser
            {
                UserName = "newstudent@unitask.vn", Email = "newstudent@unitask.vn", FullName = "Lê Hoàng Nam",
                PhoneNumber = "0912345678", UserType = UserType.Student, EkycStatus = EkycStatus.Pending,
                EkycDate = new DateTime(2026, 3, 20), CreatedAt = new DateTime(2026, 3, 1), EmailConfirmed = true
            };
            await userManager.CreateAsync(student2, "123456");
            await userManager.AddToRoleAsync(student2, "Student");

            context.StudentProfiles.Add(new StudentProfile
            {
                UserId = student2.Id, University = "Đại học Bách Khoa", Major = "Quản trị kinh doanh",
                Year = 2, GPA = 3.2m, Skills = "[\"MC\",\"Nhảy K-pop\",\"Giao tiếp\",\"Bê tráp\"]",
                Bio = "Sinh viên năm 2, ngoại hình ưa nhìn, thích tham gia sự kiện.",
                Address = "Quận Bình Thạnh, TP. HCM", DateOfBirth = new DateTime(2005, 9, 3)
            });
            context.Wallets.Add(new Wallet { UserId = student2.Id, Balance = 0 });

            // Employer
            var employer = new ApplicationUser
            {
                UserName = "employer@unitask.vn", Email = "employer@unitask.vn", FullName = "Trần Ánh Ngọc",
                PhoneNumber = "0987654321", UserType = UserType.Employer, EkycStatus = EkycStatus.Verified,
                EkycDate = new DateTime(2026, 1, 20), CreatedAt = new DateTime(2026, 1, 5), EmailConfirmed = true
            };
            await userManager.CreateAsync(employer, "123456");
            await userManager.AddToRoleAsync(employer, "Employer");

            context.EmployerProfiles.Add(new EmployerProfile
            {
                UserId = employer.Id, CompanyId = studioAnhSang.Id, Position = "CEO"
            });
            context.Wallets.Add(new Wallet { UserId = employer.Id, Balance = 1500000 });

            // Admin
            var admin = new ApplicationUser
            {
                UserName = "admin@unitask.vn", Email = "admin@unitask.vn", FullName = "Admin UniTask",
                PhoneNumber = "0900000000", UserType = UserType.Admin, EkycStatus = EkycStatus.Verified,
                EkycDate = new DateTime(2026, 1, 1), CreatedAt = new DateTime(2026, 1, 1), EmailConfirmed = true
            };
            await userManager.CreateAsync(admin, "admin123");
            await userManager.AddToRoleAsync(admin, "Admin");
            context.Wallets.Add(new Wallet { UserId = admin.Id, Balance = 0 });

            await context.SaveChangesAsync();

            // ===== 4. Seed Service Packages =====
            var packages = new List<ServicePackage>
            {
                new() { Name = "Gói 3 tháng", Price = 500000, DurationMonths = 3, Description = "Đăng tuyển không giới hạn trong 3 tháng" },
                new() { Name = "Gói 6 tháng", Price = 1029000, DurationMonths = 6, Description = "Đăng tuyển không giới hạn trong 6 tháng + ưu tiên hiển thị" },
                new() { Name = "Gói 12 tháng", Price = 1399000, DurationMonths = 12, Description = "Đăng tuyển không giới hạn + ưu tiên hiển thị + badge Premium" },
            };
            context.ServicePackages.AddRange(packages);
            await context.SaveChangesAsync();

            // Seed Subscription for employer (Gói 3 tháng)
            context.Subscriptions.Add(new Subscription
            {
                UserId = employer.Id, PackageId = packages[0].Id,
                StartDate = new DateTime(2026, 3, 1), EndDate = new DateTime(2026, 6, 1), IsActive = true
            });
            await context.SaveChangesAsync();

            // ===== 5. Seed Jobs =====
            await SeedJobsAsync(context, employer.Id, studioAnhSang.Id, makeupLinhNguyen.Id, weddingHouse.Id, shopMay.Id, tiemHoa.Id, mimu.Id, beautyBox.Id, nhaHang.Id);
        }

        private static async Task SeedJobsAsync(AppDbContext context, string employerId, int c1, int c2, int c3, int c4, int c5, int c6, int c8, int c9)
        {
            var jobDataList = new[]
            {
                new { Title = "Mẫu ảnh lookbook thời trang", CompanyId = c1, Location = "TP. Hồ Chí Minh", Type = "Freelance", Salary = "300k - 500k/buổi", Budget = 300000m, Commission = 30000m, Posted = "2026-03-24", Deadline = "2026-04-15", Views = 2345, Apps = 67, IsUrgent = true, IsRemote = false, Desc = "Cần tuyển mẫu ảnh nam/nữ chụp lookbook cho BST xuân-hè 2026.", Reqs = new[]{"Sinh viên 18-24 tuổi","Chiều cao từ 1m60 (nữ) / 1m70 (nam)","Có ảnh profile","Đúng giờ, chuyên nghiệp"}, Bens = new[]{"Thanh toán ngay sau buổi chụp","Nhận ảnh đã chỉnh sửa làm portfolio","Giờ làm linh hoạt theo lịch học","Cơ hội hợp tác lâu dài"}, Tags = new[]{"Mẫu ảnh","Thời trang","Lookbook","Freelance"} },
                new { Title = "Mẫu makeup - Thực hành trang điểm", CompanyId = c2, Location = "Hà Nội", Type = "Freelance", Salary = "150k - 250k/buổi", Budget = 150000m, Commission = 15000m, Posted = "2026-03-23", Deadline = "2026-04-30", Views = 1890, Apps = 89, IsUrgent = false, IsRemote = false, Desc = "Cần bạn nữ làm mẫu cho học viên lớp makeup thực hành.", Reqs = new[]{"Nữ, 18-25 tuổi","Da mặt không quá nhạy cảm","Ngồi yên trong 1-2 tiếng","Có thể làm ngày thường hoặc cuối tuần"}, Bens = new[]{"Được makeup miễn phí","Giờ cực linh hoạt","Thanh toán ngay","Môi trường thân thiện"}, Tags = new[]{"Mẫu makeup","Làm đẹp","Linh hoạt","Freelance"} },
                new { Title = "Bê tráp đám cưới - Cuối tuần", CompanyId = c3, Location = "TP. Hồ Chí Minh", Type = "Freelance", Salary = "400k - 600k/lần", Budget = 400000m, Commission = 40000m, Posted = "2026-03-22", Deadline = "2026-04-20", Views = 3210, Apps = 120, IsUrgent = true, IsRemote = false, Desc = "Tuyển nam/nữ bê tráp cho lễ ăn hỏi và đám cưới vào cuối tuần.", Reqs = new[]{"18-24 tuổi, ngoại hình ưa nhìn","Chiều cao phù hợp","Có thể làm cuối tuần","Biết cách bưng bê lễ vật"}, Bens = new[]{"Thanh toán cao cho 2-3 tiếng","Trang phục áo dài được cấp","Ăn tiệc miễn phí","Bổ sung kinh nghiệm sự kiện"}, Tags = new[]{"Bê tráp","Đám cưới","Sự kiện","Cuối tuần"} },
                new { Title = "PG sự kiện khai trương cửa hàng", CompanyId = c4, Location = "Đà Nẵng", Type = "Freelance", Salary = "250k - 400k/buổi", Budget = 250000m, Commission = 25000m, Posted = "2026-03-24", Deadline = "2026-03-30", Views = 876, Apps = 34, IsUrgent = true, IsRemote = false, Desc = "Cần 4-6 bạn PG/PB cho sự kiện khai trương chi nhánh mới.", Reqs = new[]{"Ngoại hình sáng, thân thiện","Năng động, giao tiếp tốt","Có kinh nghiệm PG là lợi thế","Có thể làm full ngày"}, Bens = new[]{"Thanh toán cuối ngày","Được mặc đồng phục thương hiệu","Bữa trưa miễn phí","Thưởng nếu bán được hàng"}, Tags = new[]{"PG","Sự kiện","Khai trương","Freelance"} },
                new { Title = "Livestream bán hàng online", CompanyId = c5, Location = "Remote", Type = "Freelance", Salary = "200k/buổi + hoa hồng", Budget = 200000m, Commission = 20000m, Posted = "2026-03-21", Deadline = "2026-04-15", Views = 1567, Apps = 45, IsUrgent = false, IsRemote = true, Desc = "Tuyển bạn có khả năng nói chuyện lưu loát để livestream bán hoa tươi.", Reqs = new[]{"Tự tự trước camera","Giọng nói rõ ràng","Có điện thoại/laptop chất lượng tốt","Ưu tiên có kinh nghiệm livestream"}, Bens = new[]{"Làm từ nhà","Hoa hồng theo doanh số","Lịch linh hoạt tự chọn","Được training miễn phí"}, Tags = new[]{"Livestream","Bán hàng","TikTok","Remote"} },
                new { Title = "Mẫu ảnh sản phẩm - Phụ kiện handmade", CompanyId = c6, Location = "Remote", Type = "Freelance", Salary = "200k - 350k/set ảnh", Budget = 200000m, Commission = 20000m, Posted = "2026-03-23", Deadline = "2026-04-10", Views = 1230, Apps = 56, IsUrgent = false, IsRemote = true, Desc = "Cần bạn nữ chụp ảnh đeo phụ kiện handmade bằng điện thoại.", Reqs = new[]{"Nữ 18-25, tay đẹp","Có điện thoại camera tốt","Biết chụp ảnh aesthetic","Deadline-oriented"}, Bens = new[]{"Làm hoàn toàn từ nhà","Nhận sản phẩm miễn phí","Thanh toán qua chuyển khoản","Lịch tự sắp xếp"}, Tags = new[]{"Mẫu ảnh","Sản phẩm","Handmade","Remote"} },
                new { Title = "Phụ chụp ảnh cưới - Cuối tuần", CompanyId = c1, Location = "TP. Hồ Chí Minh", Type = "Freelance", Salary = "350k - 500k/buổi", Budget = 350000m, Commission = 35000m, Posted = "2026-03-20", Deadline = "2026-04-20", Views = 998, Apps = 28, IsUrgent = false, IsRemote = false, Desc = "Tuyển assistant photographer cho các buổi chụp ảnh cưới outdoor.", Reqs = new[]{"Có sức khỏe tốt","Yêu thích nhiếp ảnh","Có thể làm cuối tuần","Chịu khó, nhanh nhẹn"}, Bens = new[]{"Học hỏi kỹ thuật chụp ảnh","Portfolio assistant","Thanh toán ngay","Môi trường sáng tạo"}, Tags = new[]{"Photography","Ảnh cưới","Assistant","Cuối tuần"} },
                new { Title = "Người mẫu KOC - Review mỹ phẩm", CompanyId = c8, Location = "Remote", Type = "Freelance", Salary = "300k - 1 triệu/video", Budget = 300000m, Commission = 30000m, Posted = "2026-03-22", Deadline = "2026-04-30", Views = 4521, Apps = 156, IsUrgent = false, IsRemote = true, Desc = "Tuyển bạn nữ quay video review/swatch mỹ phẩm cho kênh TikTok.", Reqs = new[]{"Có tài khoản TikTok/Instagram","Tự tin trước camera","Da sáng, biết makeup","Có thể quay edit video ngắn"}, Bens = new[]{"Nhận mỹ phẩm miễn phí","Làm hoàn toàn remote","Thu nhập theo video","Xây dựng thương hiệu cá nhân"}, Tags = new[]{"KOC","Review","Mỹ phẩm","TikTok","Remote"} },
                new { Title = "Nhân sự phục vụ tiệc cưới - Gấp", CompanyId = c9, Location = "Hà Nội", Type = "Freelance", Salary = "250k - 350k/buổi", Budget = 250000m, Commission = 25000m, Posted = "2026-03-24", Deadline = "2026-04-25", Views = 1876, Apps = 89, IsUrgent = true, IsRemote = false, Desc = "Cần 8-10 bạn phục vụ tiệc cưới tại nhà hàng.", Reqs = new[]{"Ngoại hình gọn gàng","Nhanh nhẹn, lễ phép","Có thể làm ca tối","Không cần kinh nghiệm"}, Bens = new[]{"Bao ăn tối","Thanh toán ngay sau buổi","Lịch đăng ký linh hoạt","Tip từ khách"}, Tags = new[]{"Phục vụ","Tiệc cưới","Nhà hàng","On-demand"} },
                new { Title = "Thiết kế Canva - Banner quảng cáo", CompanyId = c4, Location = "Remote", Type = "Freelance", Salary = "100k - 200k/banner", Budget = 100000m, Commission = 10000m, Posted = "2026-03-21", Deadline = "2026-04-15", Views = 2100, Apps = 73, IsUrgent = false, IsRemote = true, Desc = "Cần bạn thiết kế banner quảng cáo cho Facebook/Instagram bằng Canva.", Reqs = new[]{"Thành thạo Canva hoặc Photoshop","Có gu thẩm mỹ","Đúng deadline","Phản hồi nhanh qua Zalo"}, Bens = new[]{"100% remote","Lịch tự do","Thưởng nếu chất lượng tốt","Portfolio thực tế"}, Tags = new[]{"Design","Canva","Banner","Remote"} },
                new { Title = "Mẫu ảnh couple - Cafe concept", CompanyId = c1, Location = "TP. Hồ Chí Minh", Type = "Freelance", Salary = "400k/cặp/buổi", Budget = 400000m, Commission = 40000m, Posted = "2026-03-24", Deadline = "2026-04-01", Views = 1789, Apps = 42, IsUrgent = true, IsRemote = false, Desc = "Tuyển 2-3 cặp đôi để chụp ảnh concept cafe cho chiến dịch Valentine muộn.", Reqs = new[]{"Cặp đôi thật hoặc bạn bè thân","Ngoại hình sáng, dễ thương","Biết tạo dáng tự nhiên","Có thể đến Q.1 HCM"}, Bens = new[]{"Ảnh couple chuyên nghiệp miễn phí","Thanh toán ngay","Vui vẻ, thoải mái","Portfolio đẹp"}, Tags = new[]{"Mẫu ảnh","Couple","Cafe","Concept"} },
            };

            foreach (var jd in jobDataList)
            {
                var job = new Job
                {
                    EmployerId = employerId, CompanyId = jd.CompanyId, Title = jd.Title,
                    Description = jd.Desc, Location = jd.Location, Type = jd.Type,
                    SalaryText = jd.Salary, Budget = jd.Budget, Commission = jd.Commission,
                    PostedDate = DateTime.Parse(jd.Posted), Deadline = DateTime.Parse(jd.Deadline),
                    Views = jd.Views, ApplicationsCount = jd.Apps,
                    IsUrgent = jd.IsUrgent, IsRemote = jd.IsRemote, Status = JobStatus.Open
                };
                context.Jobs.Add(job);
                await context.SaveChangesAsync();

                context.JobRequirements.AddRange(jd.Reqs.Select(r => new JobRequirement { JobId = job.Id, Content = r }));
                context.JobBenefits.AddRange(jd.Bens.Select(b => new JobBenefit { JobId = job.Id, Content = b }));
                context.JobTags.AddRange(jd.Tags.Select(t => new JobTag { JobId = job.Id, TagName = t }));
            }

            await context.SaveChangesAsync();
        }
    }
}

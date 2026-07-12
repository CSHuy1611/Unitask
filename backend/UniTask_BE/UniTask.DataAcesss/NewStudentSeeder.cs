using Bogus;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

namespace UniTask.DataAcesss
{
    public static class NewStudentSeeder
    {
        public static async Task SeedStudentsAsync(IServiceProvider serviceProvider)
        {
            var context = serviceProvider.GetRequiredService<AppDbContext>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            
            // Check if we already have a large number of students (to prevent re-seeding)
            int currentStudentCount = await context.Users.CountAsync(u => u.UserType == UserType.Student);
            if (currentStudentCount >= 100)
            {
                return; // Already seeded 100+ students
            }

            Randomizer.Seed = new Random(9999);
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
                .RuleFor(p => p.University, f => f.PickRandom("Đại học FPT", "Đại học Bách Khoa", "Đại học Kinh Tế", "Đại học Ngoại Thương", "RMIT", "Đại học Quốc Gia", "Học viện Bưu chính Viễn thông"))
                .RuleFor(p => p.Major, f => f.PickRandom("CNTT", "Kinh doanh", "Marketing", "Thiết kế đồ họa", "Ngôn ngữ Anh", "Truyền thông đa phương tiện"))
                .RuleFor(p => p.Year, f => f.Random.Int(1, 4))
                .RuleFor(p => p.GPA, f => f.Random.Decimal(2.5m, 4.0m))
                .RuleFor(p => p.Skills, f => $"[\"{f.PickRandom("Giao tiếp", "Tiếng Anh")}\", \"{f.PickRandom("Làm việc nhóm", "Thuyết trình")}\", \"{f.PickRandom("Tin học văn phòng", "Thiết kế")}\"]")
                .RuleFor(p => p.Bio, f => f.Lorem.Sentence())
                .RuleFor(p => p.Address, f => f.Address.City())
                .RuleFor(p => p.DateOfBirth, f => f.Date.Past(5, new DateTime(2005, 1, 1)))
                .RuleFor(p => p.ReliabilityScore, 100);

            // Fetch existing emails to avoid duplicates across restarts
            var existingEmails = await context.Users.Select(u => u.Email).ToListAsync();
            foreach(var email in existingEmails) {
                if(email != null) usedEmails.Add(email);
            }

            for (int i = 0; i < 100; i++)
            {
                var student = studentFaker.Generate();
                
                // Double-check email uniqueness against db just in case
                if (existingEmails.Contains(student.Email))
                {
                    student.Email = CreateUniqueEmail(student.FullName + " " + i);
                    student.UserName = student.Email;
                }

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
        }
    }
}

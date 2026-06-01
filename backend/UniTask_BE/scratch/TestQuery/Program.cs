using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UniTask.DataAcesss;
using UniTask.DataAcesss.Entities;
using UniTask.DataAcesss.Entities.Enums;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("=== RUNNING EXACT DB QUERIES AND SERIALIZATION ===");
        
        var connStr = "Server=.;Database=UniTaskDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connStr);

        using var context = new AppDbContext(optionsBuilder.Options);

        // 1. Users query
        try
        {
            Console.WriteLine("\n--- Users Query ---");
            var query = context.Users;
            var sortedQuery = query
                .OrderByDescending(u => u.EkycStatus == EkycStatus.Pending)
                .ThenByDescending(u => u.EkycStatus == EkycStatus.None)
                .ThenByDescending(u => u.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await sortedQuery
                .Skip(0)
                .Take(10)
                .Select(u => new
                {
                    id = u.Id,
                    email = u.Email,
                    fullName = u.FullName,
                    phone = u.PhoneNumber,
                    role = u.UserType == UserType.Student ? "student" : (u.UserType == UserType.Employer ? "employer" : "admin"),
                    ekycStatus = u.EkycStatus == EkycStatus.Pending ? "pending" : (u.EkycStatus == EkycStatus.Verified ? "verified" : (u.EkycStatus == EkycStatus.Rejected ? "rejected" : "none")),
                    ekycFrontImage = u.EkycFrontImageUrl,
                    ekycBackImage = u.EkycBackImageUrl,
                    university = u.StudentProfile != null ? u.StudentProfile.University : "",
                    companyName = u.EmployerProfile != null && u.EmployerProfile.Company != null ? u.EmployerProfile.Company.Name : "",
                    createdAt = u.CreatedAt.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            var resObj = new
            {
                items = items,
                totalCount = totalCount,
                hasMore = 1 * 10 < totalCount
            };

            var json = JsonSerializer.Serialize(resObj);
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"Users query & serialization successful! JSON: {json.Substring(0, Math.Min(200, json.Length))}...");
            Console.ResetColor();
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Users query failed:\n{ex}");
            Console.ResetColor();
        }

        // 2. Withdrawals query
        try
        {
            Console.WriteLine("\n--- Withdrawals Query ---");
            var query = context.Transactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w.User)
                .Where(t => t.Type == TransactionType.Withdrawal);

            var sortedQuery = query
                .OrderBy(t => t.Description != null && t.Description.StartsWith("[Completed]"))
                .ThenByDescending(t => t.CreatedAt);

            var totalCount = await query.CountAsync();

            // Calculate overall stats
            var allWithdrawals = await query
                .Select(t => new { t.Amount, t.Description })
                .ToListAsync();

            var totalPendingAmount = allWithdrawals
                .Where(w => !(w.Description != null && w.Description.StartsWith("[Completed]")))
                .Sum(w => Math.Abs(w.Amount));

            var pendingCount = allWithdrawals
                .Count(w => !(w.Description != null && w.Description.StartsWith("[Completed]")));

            var totalCompletedAmount = allWithdrawals
                .Where(w => w.Description != null && w.Description.StartsWith("[Completed]"))
                .Sum(w => Math.Abs(w.Amount));

            var completedCount = allWithdrawals
                .Count(w => w.Description != null && w.Description.StartsWith("[Completed]"));

            var totalWithdrawalAmount = allWithdrawals
                .Sum(w => Math.Abs(w.Amount));

            var items = await sortedQuery
                .Skip(0)
                .Take(10)
                .Select(t => new
                {
                    id = t.Id,
                    amount = Math.Abs(t.Amount), // Số tiền yêu cầu rút dương
                    description = t.Description,
                    createdAt = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    userName = t.Wallet.User.FullName,
                    userEmail = t.Wallet.User.Email
                })
                .ToListAsync();

            var resObj = new
            {
                items = items,
                totalCount = totalCount,
                hasMore = 1 * 10 < totalCount,
                totalPendingAmount = totalPendingAmount,
                pendingCount = pendingCount,
                totalCompletedAmount = totalCompletedAmount,
                completedCount = completedCount,
                totalWithdrawalAmount = totalWithdrawalAmount
            };

            var json = JsonSerializer.Serialize(resObj);
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"Withdrawals query & serialization successful! JSON: {json.Substring(0, Math.Min(200, json.Length))}...");
            Console.ResetColor();
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Withdrawals query failed:\n{ex}");
            Console.ResetColor();
        }

        // 3. Disputes query
        try
        {
            Console.WriteLine("\n--- Disputes Query ---");
            var query = context.Jobs
                .Include(j => j.Company)
                .Include(j => j.Employer)
                .Include(j => j.SelectedStudent)
                .Where(j => j.Status == JobStatus.Disputed);

            var sortedQuery = query
                .OrderByDescending(j => j.DisputedDate);

            var totalCount = await query.CountAsync();
            var items = await sortedQuery
                .Skip(0)
                .Take(10)
                .Select(j => new
                {
                    id = j.Id,
                    title = j.Title,
                    budget = j.Budget,
                    commission = j.Commission,
                    employerName = j.Employer.FullName,
                    employerEmail = j.Employer.Email,
                    studentName = j.SelectedStudent != null ? j.SelectedStudent.FullName : "",
                    studentEmail = j.SelectedStudent != null ? j.SelectedStudent.Email : "",
                    disputeReason = j.DisputeReason,
                    employerEvidenceText = j.EmployerEvidenceText,
                    employerEvidenceUrl = j.EmployerEvidenceUrl,
                    studentEvidenceText = j.StudentEvidenceText,
                    studentEvidenceUrl = j.StudentEvidenceUrl,
                    disputedDate = j.DisputedDate.HasValue ? j.DisputedDate.Value.ToString("yyyy-MM-dd HH:mm:ss") : ""
                })
                .ToListAsync();

            var resObj = new
            {
                items = items,
                totalCount = totalCount,
                hasMore = 1 * 10 < totalCount
            };

            var json = JsonSerializer.Serialize(resObj);
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"Disputes query & serialization successful! JSON: {json.Substring(0, Math.Min(200, json.Length))}...");
            Console.ResetColor();
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Disputes query failed:\n{ex}");
            Console.ResetColor();
        }
    }
}

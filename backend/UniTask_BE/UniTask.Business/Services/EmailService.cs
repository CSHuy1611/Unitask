using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using UniTask.Business.Interfaces;

namespace UniTask.Business.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var smtpServer = _configuration["Email:SmtpServer"];
            var portStr = _configuration["Email:Port"];
            var username = _configuration["Email:Username"];
            var password = _configuration["Email:Password"];
            var senderEmail = _configuration["Email:SenderEmail"] ?? "no-reply@unitask.vn";
            var senderName = _configuration["Email:SenderName"] ?? "UniTask Notification";
            var enableSslStr = _configuration["Email:EnableSsl"] ?? "true";
            var useConsoleFallbackStr = _configuration["Email:UseConsoleFallback"] ?? "true";

            bool useConsoleFallback = !bool.TryParse(useConsoleFallbackStr, out var fallback) || fallback;
            bool enableSsl = !bool.TryParse(enableSslStr, out var ssl) || ssl;
            int port = int.TryParse(portStr, out var p) ? p : 587;

            // If SMTP settings are missing or Console fallback is configured, log the email instead of failing
            if (useConsoleFallback || string.IsNullOrEmpty(smtpServer) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || username.Contains("your-gmail"))
            {
                _logger.LogInformation("================ EMAIL CONSOLE FALLBACK ================");
                _logger.LogInformation($"To: {toEmail}");
                _logger.LogInformation($"Subject: {subject}");
                _logger.LogInformation($"Body:\n{body}");
                _logger.LogInformation("========================================================");
                await Task.CompletedTask;
                return;
            }

            try
            {
                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(senderEmail, senderName);
                    mailMessage.To.Add(new MailAddress(toEmail));
                    mailMessage.Subject = subject;
                    mailMessage.Body = body;
                    mailMessage.IsBodyHtml = true;

                    using (var smtpClient = new SmtpClient(smtpServer, port))
                    {
                        smtpClient.Credentials = new NetworkCredential(username, password);
                        smtpClient.EnableSsl = enableSsl;
                        await smtpClient.SendMailAsync(mailMessage);
                    }
                }
                _logger.LogInformation($"Email sent successfully to {toEmail} with subject '{subject}'.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {toEmail} with SMTP server. Falling back to console logging.");
                _logger.LogInformation("================ EMAIL CONSOLE FALLBACK (ON FAILURE) ================");
                _logger.LogInformation($"To: {toEmail}");
                _logger.LogInformation($"Subject: {subject}");
                _logger.LogInformation($"Body:\n{body}");
                _logger.LogInformation("=====================================================================");
            }
        }
    }
}

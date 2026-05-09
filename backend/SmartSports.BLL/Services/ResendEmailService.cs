using Microsoft.Extensions.Configuration;
using Resend;
using SmartSports.BLL.Interfaces;

namespace SmartSports.BLL.Services;

public class ResendEmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly string _fromEmail;

    public ResendEmailService(IResend resend, IConfiguration configuration)
    {
        _resend = resend;
        _fromEmail = configuration["Resend:FromEmail"]
            ?? throw new InvalidOperationException("Resend:FromEmail is not configured.");
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
            To = { toEmail },
            Subject = "Reset your SmartSports password",
            HtmlBody = $"""
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
                <a href="{resetLink}" 
                   style="background:#22c55e;color:#fff;padding:10px 20px;
                          border-radius:6px;text-decoration:none;display:inline-block;">
                    Reset Password
                </a>
                <p>If you didn't request this, ignore this email.</p>
                """,
        };

        await _resend.EmailSendAsync(message);
    }
}
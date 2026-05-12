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

    public async Task SendVerificationEmailAsync(string toEmail, string verificationLink)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
            To = { toEmail },
            Subject = "Verify your SmartSports email",
            HtmlBody = $"""
                <h2>Welcome to SmartSports!</h2>
                <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
                <a href="{verificationLink}"
                   style="background:#22c55e;color:#fff;padding:10px 20px;
                          border-radius:6px;text-decoration:none;display:inline-block;">
                    Verify Email
                </a>
                <p>If you didn't create an account, ignore this email.</p>
                """,
        };

        await _resend.EmailSendAsync(message);
    }
}
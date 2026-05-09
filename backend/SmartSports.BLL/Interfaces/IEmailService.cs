namespace SmartSports.BLL.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    Task SendVerificationEmailAsync(string toEmail, string verificationLink);
}
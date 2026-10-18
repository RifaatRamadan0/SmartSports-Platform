namespace SmartSports.BLL.Interfaces.Auth;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    Task SendVerificationEmailAsync(string toEmail, string verificationLink);
}
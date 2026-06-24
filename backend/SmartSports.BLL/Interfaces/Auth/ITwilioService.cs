namespace SmartSports.BLL.Interfaces.Auth;

public interface ITwilioService
{
    Task SendOtpAsync(string phoneNumber);
    Task<bool> VerifyOtpAsync(string phoneNumber, string code);
}

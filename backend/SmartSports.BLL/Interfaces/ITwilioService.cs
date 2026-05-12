namespace SmartSports.BLL.Interfaces;

public interface ITwilioService
{
    Task SendOtpAsync(string phoneNumber);
    Task<bool> VerifyOtpAsync(string phoneNumber, string code);
}

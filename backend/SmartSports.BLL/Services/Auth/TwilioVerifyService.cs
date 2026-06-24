using Microsoft.Extensions.Configuration;
using SmartSports.BLL.Interfaces.Auth;
using Twilio;
using Twilio.Rest.Verify.V2.Service;

namespace SmartSports.BLL.Services.Auth;

public class TwilioVerifyService : ITwilioService
{
    private readonly string _verifyServiceSid;

    public TwilioVerifyService(IConfiguration configuration)
    {
        var accountSid = configuration["Twilio:AccountSid"]
            ?? throw new InvalidOperationException("Twilio:AccountSid is not configured.");
        var authToken = configuration["Twilio:AuthToken"]
            ?? throw new InvalidOperationException("Twilio:AuthToken is not configured.");
        _verifyServiceSid = configuration["Twilio:VerifyServiceSid"]
            ?? throw new InvalidOperationException("Twilio:VerifyServiceSid is not configured.");

        TwilioClient.Init(accountSid, authToken);
    }

    public async Task SendOtpAsync(string phoneNumber)
    {
        await VerificationResource.CreateAsync(
            to:      phoneNumber,
            channel: "sms",
            pathServiceSid: _verifyServiceSid);
    }

    public async Task<bool> VerifyOtpAsync(string phoneNumber, string code)
    {
        var check = await VerificationCheckResource.CreateAsync(
            to:             phoneNumber,
            code:           code,
            pathServiceSid: _verifyServiceSid);

        return check.Status == "approved";
    }
}

using SmartSports.BLL.DTOs.Auth;

namespace SmartSports.BLL.Interfaces;

public interface IAuthService
{
    // -- Registration --
    Task RegisterAsync(RegisterRequest request, string baseUrl);
    Task<AvailabilityResponse> CheckAvailabilityAsync(string? username, string? email, string? phoneNumber);

    // -- Login & Authentication --
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
    Task<AuthResponse?> IssueSessionForUserAsync(int userId);
    Task LogoutAsync(string refreshToken);

    // -- Phone Verification --
    Task SendPhoneOtpAsync(string phoneNumber);
    Task<string> VerifyPhoneOtpAsync(string phoneNumber, string code);

    // -- Email Verification --
    Task VerifyEmailAsync(Guid token);
    Task ResendVerificationEmailAsync(string email, string baseUrl);

    // -- Forgot & Reset Password --
    Task ForgotPasswordAsync(ForgotPasswordRequest dto, string baseUrl);
    Task ResetPasswordAsync(ResetPasswordRequest dto);
}

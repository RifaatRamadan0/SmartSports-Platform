using SmartSports.BLL.DTOs.Auth;

namespace SmartSports.BLL.Interfaces;

public interface IAuthService
{
    // -- Registration --
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AvailabilityResponse> CheckAvailabilityAsync(string? username, string? email, string? phoneNumber);

    // -- Login & Authentication --
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);

    Task LogoutAsync(string refreshToken);

    // -- Forget and Reset Password
    Task ForgotPasswordAsync(ForgotPasswordRequest dto, string baseUrl);
    Task ResetPasswordAsync(ResetPasswordRequest dto);
}

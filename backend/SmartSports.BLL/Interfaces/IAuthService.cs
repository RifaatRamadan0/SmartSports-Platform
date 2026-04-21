using SmartSports.BLL.DTOs;
using SmartSports.BLL.DTOs.Auth;

namespace SmartSports.BLL.Interfaces;

public interface IAuthService
{
    // -- Registeration --
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    // -- Login & Authentication --
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(RefreshTokenRequest token);
}

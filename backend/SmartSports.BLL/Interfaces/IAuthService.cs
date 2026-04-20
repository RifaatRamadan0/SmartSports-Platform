using SmartSports.BLL.DTOs;

namespace SmartSports.BLL.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
}

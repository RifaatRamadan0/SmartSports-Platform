using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Auth;

public interface IRefreshTokenRepository
{
    Task CreateAsync(RefreshToken refreshToken);
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task<int> RevokeAsync(string token);
    Task RevokeAllForUserAsync(int userId);
    Task DeleteExpiredAsync();
}

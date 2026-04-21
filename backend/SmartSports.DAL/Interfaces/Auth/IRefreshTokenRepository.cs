using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Auth
{
    public interface IRefreshTokenRepository
    {
        Task CreateAsync(RefreshToken refreshToken);
        Task<RefreshToken?> GetByTokenAsync(string token);

        // Mark a token as revoked — called when user logs out
        Task RevokeAsync(string token);

        // Delete all refresh tokens for a user
        // Called when user changes password or account is compromised
        Task RevokeAllForUserAsync(int userId);
    }
}

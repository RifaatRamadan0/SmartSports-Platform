using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Auth;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken> CreateAsync(int userId);
    Task<PasswordResetToken?> GetByTokenAsync(Guid token);
    Task MarkUsedAsync(Guid token);
    Task DeleteExpiredAsync();
}
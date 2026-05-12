using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Auth;

public interface IEmailVerificationTokenRepository
{
    Task<EmailVerificationToken> CreateAsync(int userId);
    Task<EmailVerificationToken?> GetByTokenAsync(Guid token);
    Task MarkUsedAsync(Guid token);
    Task DeleteExpiredAsync();
}

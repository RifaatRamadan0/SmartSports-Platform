using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public EmailVerificationTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    // Atomically supersede any prior unused tokens for this user so only the latest
    // link is valid — prevents multiple concurrent verification windows from resend.
    public async Task<EmailVerificationToken> CreateAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            WITH invalidated AS (
                UPDATE email_verification_tokens
                SET    used_at = NOW()
                WHERE  user_id = @UserId
                  AND  used_at IS NULL
                RETURNING 1
            )
            INSERT INTO email_verification_tokens (user_id)
            VALUES (@UserId)
            RETURNING id, user_id, token, expires_at, used_at, created_at;
            """;

        return await connection.QuerySingleAsync<EmailVerificationToken>(sql, new { UserId = userId });
    }

    public async Task<EmailVerificationToken?> GetByTokenAsync(Guid token)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            SELECT id, user_id, token, expires_at, used_at, created_at
            FROM   email_verification_tokens
            WHERE  token = @Token;
            """;

        return await connection.QuerySingleOrDefaultAsync<EmailVerificationToken>(sql, new { Token = token });
    }

    public async Task MarkUsedAsync(Guid token)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            UPDATE email_verification_tokens
            SET    used_at = NOW()
            WHERE  token   = @Token
              AND  used_at IS NULL;
            """;

        await connection.ExecuteAsync(sql, new { Token = token });
    }

    public async Task DeleteExpiredAsync()
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            DELETE FROM email_verification_tokens
            WHERE expires_at < NOW()
               OR used_at IS NOT NULL;
            """;

        await connection.ExecuteAsync(sql);
    }
}

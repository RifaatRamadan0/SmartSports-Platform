using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;

namespace SmartSports.DAL.Repositories.Auth;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.DAL.Repositories.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PasswordResetTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }


    //  Create
    // Atomically supersede any prior unused tokens for this user so only the latest
    // link is valid — prevents multiple concurrent reset windows from one account.
    public async Task<PasswordResetToken> CreateAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            WITH invalidated AS (
                UPDATE password_reset_tokens
                SET    used_at = NOW()
                WHERE  user_id = @UserId
                  AND  used_at IS NULL
                RETURNING 1
            )
            INSERT INTO password_reset_tokens (user_id)
            VALUES (@UserId)
            RETURNING *;
            """;

        return await connection.QuerySingleAsync<PasswordResetToken>(sql, new { UserId = userId });
    }

    // Get by token
    public async Task<PasswordResetToken?> GetByTokenAsync(Guid token)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            SELECT id, user_id, token, expires_at, used_at, created_at
            FROM   password_reset_tokens
            WHERE  token = @Token
              AND  used_at IS NULL
              AND  expires_at > NOW();
            """;

        return await connection.QuerySingleOrDefaultAsync<PasswordResetToken>(sql, new { Token = token });
    }

    // Atomically marks the token used and returns the owner's user_id.
    // Returns null if the token is invalid, expired, or already consumed.
    public async Task<int?> ConsumeAsync(Guid token)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            UPDATE password_reset_tokens
            SET    used_at = NOW()
            WHERE  token      = @Token
              AND  used_at    IS NULL
              AND  expires_at > NOW()
            RETURNING user_id;
            """;

        return await connection.ExecuteScalarAsync<int?>(sql, new { Token = token });
    }

    // Cleanup
    public async Task DeleteExpiredAsync()
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            DELETE FROM password_reset_tokens
            WHERE expires_at < NOW()
               OR used_at IS NOT NULL;
            """;

        await connection.ExecuteAsync(sql);
    }
}
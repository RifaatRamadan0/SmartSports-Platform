using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PasswordResetTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }


    //  Create
    public async Task<PasswordResetToken> CreateAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
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

    // Mark used
    public async Task MarkUsedAsync(Guid token)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string sql = """
            UPDATE password_reset_tokens
            SET    used_at = NOW()
            WHERE  token   = @Token
              AND  used_at IS NULL;
            """;

        await connection.ExecuteAsync(sql, new { Token = token });
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
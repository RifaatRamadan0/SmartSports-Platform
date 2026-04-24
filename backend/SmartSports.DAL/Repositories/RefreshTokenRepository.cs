using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public RefreshTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task CreateAsync(RefreshToken refreshToken)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            INSERT INTO refresh_tokens (user_id, token, expires_at, is_revoked)
            VALUES (@UserId, @Token, @ExpiresAt, @IsRevoked)
            """,
            new
            {
                UserId = refreshToken.UserId,
                Token = refreshToken.Token,
                ExpiresAt = refreshToken.ExpiresAt,
                IsRevoked = refreshToken.IsRevoked
            });
    }

    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<RefreshToken>(
            """
            SELECT id, user_id, token, expires_at, created_at, is_revoked
            FROM refresh_tokens
            WHERE token = @Token
            """,
            new { Token = token });
    }

    public async Task<int> RevokeAsync(string token)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteAsync(
            """
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE token = @Token AND is_revoked = FALSE
            """,
            new { Token = token });
    }

    public async Task RevokeAllForUserAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            UPDATE refresh_tokens
            SET is_revoked = TRUE
            WHERE user_id = @UserId
            """,
            new { UserId = userId });
    }

    public async Task DeleteExpiredAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            DELETE FROM refresh_tokens
            WHERE is_revoked = TRUE OR expires_at < NOW()
            """);
    }
}

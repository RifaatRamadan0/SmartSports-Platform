using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;


namespace SmartSports.DAL.Repositories
{
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
                Insert into refresh_tokens (user_id, token, expires_at, is_revoked)
                Values (@UserId, @Token, @ExpiresAt, @IsRevoked)
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
                Select id, user_id, token, expires_at, created_at, is_revoked
                from refresh_tokens
                where token = @Token
                """,    
                new { Token = token });
        }

        public async Task RevokeAsync(string token)
        {
            using var connection = _connectionFactory.CreateConnection();

            await connection.ExecuteAsync(
                """
                Update refresh_tokens
                set is_revoked = True
                where token = @Token
                """,
                new { Token = token }); 
        }

        public async Task RevokeAllForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();

            await connection.ExecuteAsync(
                """
                update refresh_tokens
                set is_revoked = True
                where userId = @UserId
                """,
                new { UserId = userId });
        }
    }
}

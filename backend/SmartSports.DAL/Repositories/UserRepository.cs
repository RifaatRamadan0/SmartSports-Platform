using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = @Email)",
            new { Email = email });
    }

    public async Task<bool> ExistsByUsernameAsync(string username)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = @Username)",
            new { Username = username });
    }

    public async Task<Role?> GetRoleByNameAsync(string roleName)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Role>(
            "SELECT id, name FROM roles WHERE name = @Name",
            new { Name = roleName });
    }

    public async Task<int> CreateWithRoleAsync(User user, int roleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var userId = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO users (username, email, password_hash, phone_number, profile_picture, skill_level, preferred_position)
            VALUES (@Username, @Email, @PasswordHash, @PhoneNumber, @ProfilePicture, @SkillLevel, @PreferredPosition)
            RETURNING id
            """,
            user, transaction);

        await connection.ExecuteAsync(
            "INSERT INTO user_roles (user_id, role_id) VALUES (@UserId, @RoleId)",
            new { UserId = userId, RoleId = roleId }, transaction);

        transaction.Commit();
        return userId;
    }

}

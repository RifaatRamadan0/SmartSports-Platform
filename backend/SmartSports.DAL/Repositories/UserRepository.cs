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

    // -- Registration methods --

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

    public async Task<int> CreateAsync(User user)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>("""
            INSERT INTO users (username, email, password_hash, phone_number, profile_picture, skill_level, preferred_position)
            VALUES (@Username, @Email, @PasswordHash, @PhoneNumber, @ProfilePicture, @SkillLevel, @PreferredPosition)
            RETURNING id
            """,
            user);
    }

    public async Task<Role?> GetRoleByNameAsync(string roleName)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Role>(
            "SELECT id, name FROM roles WHERE name = @Name",
            new { Name = roleName });
    }

    public async Task AssignRoleAsync(int userId, int roleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            "INSERT INTO user_roles (user_id, role_id) VALUES (@UserId, @RoleId)",
            new { UserId = userId, RoleId = roleId });
    }

    // -- Login & Authentication methods --

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position, created_at
            FROM users
            WHERE email = @Email
            """,
            new { Email = email });
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position, created_at
            FROM users
            WHERE username = @Username
            """,
            new { Username = username });
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position, created_at
            FROM users
            WHERE id = @UserId
            """,
            new { UserId = userId });
    }

    public async Task<string?> GetUserRoleAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<string>(
            """
        SELECT r.name 
        FROM roles r
        INNER JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = @UserId
        LIMIT 1
        """,
            new { UserId = userId });
    }
}

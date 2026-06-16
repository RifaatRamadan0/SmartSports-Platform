using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Exceptions;

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
            "SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER(@Email))",
            new { Email = email });
    }

    public async Task<bool> ExistsByUsernameAsync(string username)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER(@Username))",
            new { Username = username });
    }

    public async Task<bool> ExistsByPhoneNumberAsync(string phoneNumber)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE phone_number = @PhoneNumber)",
            new { PhoneNumber = phoneNumber });
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
        await connection.OpenAsync();
        using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var userId = await connection.ExecuteScalarAsync<int>("""
                INSERT INTO users (username, email, password_hash, phone_number, profile_picture, skill_level, preferred_position, is_phone_verified)
                VALUES (@Username, @Email, @PasswordHash, @PhoneNumber, @ProfilePicture, @SkillLevel, @PreferredPosition, @IsPhoneVerified)
                RETURNING id
                """,
                user, transaction);

            await connection.ExecuteAsync(
                "INSERT INTO user_roles (user_id, role_id) VALUES (@UserId, @RoleId)",
                new { UserId = userId, RoleId = roleId }, transaction);

            await transaction.CommitAsync();
            return userId;
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            await transaction.RollbackAsync();
            var message = ex.ConstraintName switch
            {
                "users_email_lower_idx"    => "Email is already in use.",
                "users_username_lower_idx" => "Username is already taken.",
                "users_phone_number_key"   => "Phone number is already registered.",
                _                          => "An account with these details already exists."
            };
            throw new ArgumentException(message);
        }
    }

    // -- Login & Authentication methods --

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position,
                   is_email_verified, is_phone_verified, created_at
            FROM users
            WHERE LOWER(email) = LOWER(@Email)
            """,
            new { Email = email });
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position,
                   is_email_verified, is_phone_verified, created_at
            FROM users
            WHERE LOWER(username) = LOWER(@Username)
            """,
            new { Username = username });
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<User>(
            """
            SELECT id, username, email, password_hash, phone_number,
                   profile_picture, skill_level, preferred_position,
                   is_email_verified, is_phone_verified, created_at
            FROM users
            WHERE id = @UserId
            """,
            new { UserId = userId });
    }

    public async Task<IEnumerable<string>> GetUserRolesAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<string>(
            """
            SELECT r.name
            FROM roles r
            INNER JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = @UserId
            """,
            new { UserId = userId });
    }

    // -- Password management --

    public async Task UpdatePasswordAsync(int userId, string passwordHash)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET password_hash = @PasswordHash
            WHERE id = @UserId
            """,
            new { UserId = userId, PasswordHash = passwordHash });
    }

    // -- Email verification --

    public async Task VerifyEmailAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET is_email_verified = TRUE
            WHERE id = @UserId
            """,
            new { UserId = userId });
    }

    // -- Profile management --

    public async Task<bool> UpdateProfileAsync(int userId, string username, string phoneNumber,
        string? profilePicture, short? skillLevel, string? preferredPosition)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            var rows = await connection.ExecuteAsync(
                """
                UPDATE users
                SET username           = @Username,
                    phone_number       = @PhoneNumber,
                    profile_picture    = @ProfilePicture,
                    skill_level        = @SkillLevel,
                    preferred_position = @PreferredPosition,
                    is_phone_verified  = CASE WHEN phone_number = @PhoneNumber
                                             THEN is_phone_verified ELSE FALSE END
                WHERE id = @UserId
                """,
                new { UserId = userId, Username = username, PhoneNumber = phoneNumber,
                      ProfilePicture = profilePicture, SkillLevel = skillLevel,
                      PreferredPosition = preferredPosition });
            return rows > 0;
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            var message = ex.ConstraintName switch
            {
                "users_username_lower_idx" => "Username is already taken.",
                "users_phone_number_key"   => "Phone number is already registered.",
                _                          => "A conflict occurred with existing account details."
            };
            throw new ConflictException(message);
        }
    }

    // -- Phone verification --

    public async Task VerifyPhoneAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            "UPDATE users SET is_phone_verified = TRUE WHERE id = @UserId",
            new { UserId = userId });
    }

    // -- Role management --

    public async Task AddRoleAsync(int userId, int roleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            INSERT INTO user_roles (user_id, role_id)
            VALUES (@UserId, @RoleId)
            ON CONFLICT DO NOTHING
            """,
            new { UserId = userId, RoleId = roleId });
    }
}

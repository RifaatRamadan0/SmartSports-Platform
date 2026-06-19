using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;
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
                   is_email_verified, is_phone_verified, is_banned, created_at, deleted_at
            FROM users
            WHERE LOWER(email) = LOWER(@Email)
              AND deleted_at IS NULL
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
                   is_email_verified, is_phone_verified, is_banned, created_at, deleted_at
            FROM users
            WHERE LOWER(username) = LOWER(@Username)
              AND deleted_at IS NULL
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
                   is_email_verified, is_phone_verified, is_banned, created_at, deleted_at
            FROM users
            WHERE id = @UserId
              AND deleted_at IS NULL
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

    // -- Admin user management --

    public async Task<(IEnumerable<AdminUserRow> Users, int TotalCount)> ListUsersAsync(
        int page, int pageSize, string? role, bool? isBanned)
    {
        using var connection = _connectionFactory.CreateConnection();
        var offset = (page - 1) * pageSize;

        using var multi = await connection.QueryMultipleAsync(
            """
            SELECT u.id, u.username, u.email, u.phone_number, u.is_banned, u.created_at,
                   COALESCE(STRING_AGG(r.name, ',' ORDER BY r.name), '') AS role_names
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.deleted_at IS NULL
            AND (@Role IS NULL OR EXISTS (
                SELECT 1 FROM user_roles ur2
                INNER JOIN roles r2 ON r2.id = ur2.role_id
                WHERE ur2.user_id = u.id AND r2.name = @Role
            ))
            AND (@IsBanned IS NULL OR u.is_banned = @IsBanned)
            GROUP BY u.id, u.username, u.email, u.phone_number, u.is_banned, u.created_at
            ORDER BY u.created_at DESC
            LIMIT @PageSize OFFSET @Offset;

            SELECT COUNT(*)
            FROM users u
            WHERE u.deleted_at IS NULL
            AND (@Role IS NULL OR EXISTS (
                SELECT 1 FROM user_roles ur2
                INNER JOIN roles r2 ON r2.id = ur2.role_id
                WHERE ur2.user_id = u.id AND r2.name = @Role
            ))
            AND (@IsBanned IS NULL OR u.is_banned = @IsBanned);
            """,
            new { Role = role, IsBanned = isBanned, PageSize = pageSize, Offset = offset });

        var users      = await multi.ReadAsync<AdminUserRow>();
        var totalCount = await multi.ReadSingleAsync<int>();
        return (users, totalCount);
    }

    public async Task SetBannedAsync(int userId, bool isBanned)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            "UPDATE users SET is_banned = @IsBanned WHERE id = @UserId AND deleted_at IS NULL",
            new { UserId = userId, IsBanned = isBanned });
        if (rows == 0)
            throw new KeyNotFoundException("User not found.");
    }

    public async Task<bool> HasActiveFutureBookingsAsync(int userId)
    {
        // True if the user has any non-cancelled booking from today onwards, either as
        // the booking player or as the owner of the booked pitch. Used to block account
        // deletion while obligations are outstanding (no refund flow exists yet).
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(
            """
            SELECT EXISTS (
                SELECT 1
                FROM bookings b
                WHERE b.user_id = @UserId
                  AND b.status != 'cancelled'::booking_status
                  AND b.booking_date >= CURRENT_DATE
            )
            OR EXISTS (
                SELECT 1
                FROM bookings b
                INNER JOIN pitches p ON p.id = b.pitch_id
                WHERE p.owner_id = @UserId
                  AND b.status != 'cancelled'::booking_status
                  AND b.booking_date >= CURRENT_DATE
            )
            """,
            new { UserId = userId });
    }

    public async Task SoftDeleteAsync(int userId)
    {
        // Atomically retire an account in a single transaction so it can never be left
        // half-deleted (e.g. pitches removed while the user row survives, or vice versa):
        //   1. Anonymize the unique/PII fields so the original email/username/phone are
        //      released for re-registration and no personal data is retained, then stamp
        //      deleted_at. The id is unique, so the placeholder values never collide.
        //   2. Soft-delete any pitches the user owns so they don't linger as live,
        //      unmanageable listings. Callers must ensure no upcoming bookings exist.
        //   3. Revoke every refresh token so live sessions can't be refreshed.
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var rows = await connection.ExecuteAsync(
                """
                UPDATE users
                SET deleted_at      = NOW(),
                    email           = 'deleted_' || id || '@deleted.local',
                    username        = 'deleted_user_' || id,
                    phone_number    = 'deleted_' || id,
                    profile_picture = NULL
                WHERE id = @UserId
                  AND deleted_at IS NULL
                """,
                new { UserId = userId }, transaction);
            if (rows == 0)
                throw new KeyNotFoundException("User not found.");

            await connection.ExecuteAsync(
                """
                UPDATE pitches
                SET    deleted_at = NOW()
                WHERE  owner_id   = @UserId
                  AND  deleted_at IS NULL
                """,
                new { UserId = userId }, transaction);

            await connection.ExecuteAsync(
                "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = @UserId",
                new { UserId = userId }, transaction);

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}

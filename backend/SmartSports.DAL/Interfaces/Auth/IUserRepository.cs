using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Auth;

public interface IUserRepository
{
    // -- Registration methods --
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username);
    Task<bool> ExistsByPhoneNumberAsync(string phoneNumber);
    Task<int> CreateWithRoleAsync(User user, int roleId);
    Task<Role?> GetRoleByNameAsync(string roleName);

    // -- Login & Authentication methods --
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int userId);
    Task<IEnumerable<string>> GetUserRolesAsync(int userId);

    // -- Password management --
    Task UpdatePasswordAsync(int userId, string passwordHash);

    // -- Email verification --
    Task VerifyEmailAsync(int userId);

    // -- Phone verification --
    Task VerifyPhoneAsync(int userId);

    // -- Role management --
    Task AddRoleAsync(int userId, int roleId);

    // -- Profile management --
    Task<bool> UpdateProfileAsync(int userId, string username, string phoneNumber,
        string? profilePicture, short? skillLevel, string? preferredPosition);

    // -- Admin user management --
    Task<(IEnumerable<AdminUserRow> Users, int TotalCount)> ListUsersAsync(
        int page, int pageSize, string? role, bool? isBanned);
    Task SetBannedAsync(int userId, bool isBanned);
}

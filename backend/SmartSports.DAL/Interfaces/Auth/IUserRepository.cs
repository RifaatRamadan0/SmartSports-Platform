using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Auth;

public interface IUserRepository
{
    // -- Registration methods --
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username);
    Task<int> CreateWithRoleAsync(User user, int roleId);
    Task<Role?> GetRoleByNameAsync(string roleName);

    // -- Login & Authentication methods --
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int userId);
    Task<IEnumerable<string>> GetUserRolesAsync(int userId);
}

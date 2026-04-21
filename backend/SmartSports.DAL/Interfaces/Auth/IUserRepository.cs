using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces;

public interface IUserRepository
{
    // -- Registration methods --
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username);
    Task<int> CreateAsync(User user);
    Task<Role?> GetRoleByNameAsync(string roleName);
    Task AssignRoleAsync(int userId, int roleId);

    // -- Login & Authentication methods --
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int userId);   
}

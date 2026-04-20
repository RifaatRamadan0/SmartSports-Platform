using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces;

public interface IUserRepository
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username);
    Task<int> CreateAsync(User user);
    Task<Role?> GetRoleByNameAsync(string roleName);
    Task AssignRoleAsync(int userId, int roleId);
}

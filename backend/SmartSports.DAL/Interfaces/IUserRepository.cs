using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces;

public interface IUserRepository
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username);
    Task<int> CreateWithRoleAsync(User user, int roleId);
    Task<Role?> GetRoleByNameAsync(string roleName);
}

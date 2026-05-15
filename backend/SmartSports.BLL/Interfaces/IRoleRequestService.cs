using SmartSports.BLL.DTOs.RoleRequest;

namespace SmartSports.BLL.Interfaces;

public interface IRoleRequestService
{
    Task RequestRoleAsync(int userId, IEnumerable<string> currentRoles, string requestedRole);
    Task AddPlayerRoleInstantlyAsync(int userId, IEnumerable<string> currentRoles);
    Task<IEnumerable<RoleRequestResponse>> GetMyRequestsAsync(int userId);
}

using SmartSports.BLL.DTOs.RoleRequest;

namespace SmartSports.BLL.Interfaces.RoleRequest;

public interface IRoleRequestService
{
    Task RequestRoleAsync(int userId, string requestedRole);
    Task AddPlayerRoleInstantlyAsync(int userId);
    Task<IEnumerable<RoleRequestResponse>> GetMyRequestsAsync(int userId);
}

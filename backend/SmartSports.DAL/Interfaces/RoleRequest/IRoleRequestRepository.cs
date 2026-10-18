using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.RoleRequests;

public interface IRoleRequestRepository
{
    Task<int> CreateAsync(int userId, string requestedRole);
    Task<IEnumerable<RoleRequest>> GetByUserAsync(int userId);
    Task<(IEnumerable<RoleRequest> Items, long TotalCount)> GetPendingAsync(int page, int pageSize);
    Task<RoleRequest?> GetByIdAsync(int requestId);
    Task ApproveAsync(int requestId, int adminId, int roleId);
    Task RejectAsync(int requestId, int adminId, string? reason);
}

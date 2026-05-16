using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.RoleRequest;

namespace SmartSports.BLL.Interfaces;

public interface IAdminRoleRequestService
{
    Task<PagedResult<AdminRoleRequestSummary>> GetPendingRequestsAsync(int page, int pageSize);
    Task ApproveRequestAsync(int requestId, int adminId);
    Task RejectRequestAsync(int requestId, int adminId, string? reason);
}

using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Common;
using SmartSports.BLL.DTOs.RoleRequest;

namespace SmartSports.BLL.Interfaces.Admin;

public interface IAdminRoleRequestService
{
    Task<PagedResult<AdminRoleRequestSummary>> GetPendingRequestsAsync(int page, int pageSize);
    Task ApproveRequestAsync(int requestId, int adminId);
    Task RejectRequestAsync(int requestId, int adminId, string? reason);
}

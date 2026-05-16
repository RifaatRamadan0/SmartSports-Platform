using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.RoleRequest;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.RoleRequests;

namespace SmartSports.BLL.Services;

public class AdminRoleRequestService : IAdminRoleRequestService
{
    private readonly IRoleRequestRepository _roleRequestRepository;
    private readonly IUserRepository        _userRepository;

    public AdminRoleRequestService(
        IRoleRequestRepository roleRequestRepository,
        IUserRepository        userRepository)
    {
        _roleRequestRepository = roleRequestRepository;
        _userRepository        = userRepository;
    }

    public async Task<PagedResult<AdminRoleRequestSummary>> GetPendingRequestsAsync(int page, int pageSize)
    {
        var (items, totalCount) = await _roleRequestRepository.GetPendingAsync(page, pageSize);
        return new PagedResult<AdminRoleRequestSummary>
        {
            Items = items.Select(r => new AdminRoleRequestSummary
            {
                Id            = r.Id,
                UserId        = r.UserId,
                Username      = r.Username ?? string.Empty,
                Email         = r.Email    ?? string.Empty,
                RequestedRole = r.RequestedRole,
                CreatedAt     = r.CreatedAt,
            }),
            TotalCount = (int)totalCount,
            Page       = page,
            PageSize   = pageSize,
        };
    }

    public async Task ApproveRequestAsync(int requestId, int adminId)
    {
        var request = await _roleRequestRepository.GetByIdAsync(requestId)
            ?? throw new KeyNotFoundException("Role request not found.");

        var role = await _userRepository.GetRoleByNameAsync(request.RequestedRole)
            ?? throw new InvalidOperationException($"Role '{request.RequestedRole}' not found in database.");

        await _roleRequestRepository.ApproveAsync(requestId, adminId, role.Id);
    }

    public async Task RejectRequestAsync(int requestId, int adminId, string? reason)
    {
        await _roleRequestRepository.RejectAsync(requestId, adminId, reason);
    }
}

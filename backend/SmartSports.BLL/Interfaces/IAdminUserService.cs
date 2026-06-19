using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;

namespace SmartSports.BLL.Interfaces;

public interface IAdminUserService
{
    Task<PagedResult<AdminUserSummaryResponse>> ListUsersAsync(int page, int pageSize, string? role, bool? isBanned);
    Task<AdminUserSummaryResponse> GetUserAsync(int userId);
    Task BanUserAsync(int requestingAdminId, int userId);
    Task UnbanUserAsync(int userId);
    Task DeleteUserAsync(int requestingAdminId, int userId);
}

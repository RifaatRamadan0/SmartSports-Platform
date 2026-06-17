using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.BLL.Services;

public class AdminUserService(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository) : IAdminUserService
{
    public async Task<PagedResult<AdminUserSummaryResponse>> ListUsersAsync(
        int page, int pageSize, string? role, bool? isBanned)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var (users, totalCount) = await userRepository.ListUsersAsync(page, pageSize, role, isBanned);

        return new PagedResult<AdminUserSummaryResponse>
        {
            Items      = users.Select(MapToResponse),
            TotalCount = totalCount,
            Page       = page,
            PageSize   = pageSize,
        };
    }

    public async Task<AdminUserSummaryResponse> GetUserAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = await userRepository.GetUserRolesAsync(userId);

        return new AdminUserSummaryResponse
        {
            Id          = user.Id,
            Username    = user.Username,
            Email       = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsBanned    = user.IsBanned,
            CreatedAt   = user.CreatedAt,
            Roles       = roles,
        };
    }

    public async Task BanUserAsync(int requestingAdminId, int userId)
    {
        if (userId == requestingAdminId)
            throw new ArgumentException("You cannot ban your own account.");

        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = await userRepository.GetUserRolesAsync(userId);
        if (roles.Contains("Admin"))
            throw new ArgumentException("Admin accounts cannot be banned.");

        if (user.IsBanned)
            throw new ArgumentException("User is already banned.");

        await userRepository.SetBannedAsync(userId, true);

        // Kill any live sessions so the ban takes effect immediately rather than
        // lingering until the user's refresh token expires (up to 7 days).
        await refreshTokenRepository.RevokeAllForUserAsync(userId);
    }

    public async Task UnbanUserAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!user.IsBanned)
            throw new ArgumentException("User is not banned.");

        await userRepository.SetBannedAsync(userId, false);
    }

    public async Task DeleteUserAsync(int requestingAdminId, int userId)
    {
        if (userId == requestingAdminId)
            throw new ArgumentException("You cannot delete your own account.");

        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = await userRepository.GetUserRolesAsync(userId);
        if (roles.Contains("Admin"))
            throw new ArgumentException("Admin accounts cannot be deleted.");

        if (await userRepository.HasActiveFutureBookingsAsync(userId))
            throw new ArgumentException(
                "This user has active upcoming bookings (as a player or pitch owner). Resolve those before deleting the account.");

        // Atomically retire the account: anonymize + stamp the user row, take down the
        // owner's pitches so they don't linger as live, unmanageable listings, and revoke
        // every refresh token. The booking guard above guarantees none of those pitches
        // have upcoming bookings.
        await userRepository.SoftDeleteAsync(userId);
    }

    private static AdminUserSummaryResponse MapToResponse(AdminUserRow row) => new()
    {
        Id          = row.Id,
        Username    = row.Username,
        Email       = row.Email,
        PhoneNumber = row.PhoneNumber,
        IsBanned    = row.IsBanned,
        CreatedAt   = row.CreatedAt,
        Roles       = string.IsNullOrEmpty(row.RoleNames)
            ? Array.Empty<string>()
            : row.RoleNames.Split(',', StringSplitOptions.RemoveEmptyEntries),
    };
}

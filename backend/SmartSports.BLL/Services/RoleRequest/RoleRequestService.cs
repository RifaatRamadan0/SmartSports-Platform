using SmartSports.BLL.DTOs.RoleRequest;
using SmartSports.BLL.Interfaces.RoleRequest;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.RoleRequests;

namespace SmartSports.BLL.Services.RoleRequest;

public class RoleRequestService : IRoleRequestService
{
    private readonly IRoleRequestRepository _roleRequestRepository;
    private readonly IUserRepository        _userRepository;

    private static readonly HashSet<string> RequestableRoles = ["PitchOwner"];

    public RoleRequestService(
        IRoleRequestRepository roleRequestRepository,
        IUserRepository        userRepository)
    {
        _roleRequestRepository = roleRequestRepository;
        _userRepository        = userRepository;
    }

    public async Task RequestRoleAsync(int userId, string requestedRole)
    {
        if (!RequestableRoles.Contains(requestedRole))
            throw new ArgumentException($"Role '{requestedRole}' cannot be requested.");

        // Re-read from DB rather than trusting JWT claims: the access token can outlive
        // a role revocation by up to its expiry window, so claim-based checks let
        // already-revoked users pass authorization guards. The DB is the source of truth.
        var currentRoles = (await _userRepository.GetUserRolesAsync(userId)).ToHashSet(StringComparer.Ordinal);

        if (currentRoles.Contains(requestedRole))
            throw new ArgumentException($"You already have the '{requestedRole}' role.");

        await _roleRequestRepository.CreateAsync(userId, requestedRole);
    }

    public async Task AddPlayerRoleInstantlyAsync(int userId)
    {
        // See RequestRoleAsync for why claims are not used here.
        var currentRoles = (await _userRepository.GetUserRolesAsync(userId)).ToHashSet(StringComparer.Ordinal);

        if (!currentRoles.Contains("PitchOwner"))
            throw new ArgumentException("Only Pitch Owners can add Player access instantly.");

        if (currentRoles.Contains("Player"))
            throw new ArgumentException("You already have the Player role.");

        var role = await _userRepository.GetRoleByNameAsync("Player")
            ?? throw new InvalidOperationException("Player role not found in database.");

        await _userRepository.AddRoleAsync(userId, role.Id);
    }

    public async Task<IEnumerable<RoleRequestResponse>> GetMyRequestsAsync(int userId)
    {
        var requests = await _roleRequestRepository.GetByUserAsync(userId);
        return requests.Select(r => new RoleRequestResponse
        {
            Id              = r.Id,
            RequestedRole   = r.RequestedRole,
            Status          = r.Status,
            RejectionReason = r.RejectionReason,
            CreatedAt       = r.CreatedAt,
        });
    }
}

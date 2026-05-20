using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Invitation;

public interface IInvitationRepository
{
    /// <summary>
    /// Inserts a new invitation row and returns the generated id.
    /// </summary>
    Task<int> CreateAsync(Domain.Entities.Invitation invitation);

    /// <summary>
    /// Returns true if a pending invitation for the given match and invitee already exists.
    /// </summary>
    Task<bool> ExistsPendingAsync(int matchId, int invitedUserId);

    /// <summary>
    /// Returns all non-expired pending invitations addressed to the given user,
    /// joined to match/pitch/sport/inviter for display in the inbox.
    /// </summary>
    Task<IEnumerable<PendingInvitationRow>> GetPendingByUserIdAsync(int userId);

    /// <summary>
    /// Returns the invitation only when it exists, belongs to the given user, and is pending.
    /// Returns null if any of those conditions fail — used to gate Accept/Decline.
    /// </summary>
    Task<Domain.Entities.Invitation?> GetPendingByIdAsync(int invitationId, int userId);

    /// <summary>
    /// Atomically transitions the invitation status. The WHERE clause guards both ownership
    /// (invited_user_id = @UserId) and state (status = 'pending'), so concurrent requests
    /// for the same invitation are safe. Returns the number of rows updated (0 = already
    /// actioned, expired, or not owned by this user).
    /// </summary>
    Task<int> UpdateStatusAsync(int invitationId, int userId, string newStatus);
}

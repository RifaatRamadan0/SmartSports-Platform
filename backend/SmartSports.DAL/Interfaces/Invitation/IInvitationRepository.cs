using SmartSports.Domain.Entities.Projections;
using InvitationEntity = SmartSports.Domain.Entities.Invitation;

namespace SmartSports.DAL.Interfaces.Invitation;

public interface IInvitationRepository
{
    /// <summary>Returns an existing non-expired link-based invitation for a match, or null if none exists.</summary>
    Task<InvitationEntity?> GetActiveByMatchIdAsync(int matchId);

    /// <summary>Returns the invitation by token, or null if not found.</summary>
    Task<InvitationEntity?> GetByTokenAsync(string token);

    /// <summary>
    /// Inserts a new invitation row and returns the full persisted entity.
    /// Throws ConflictException on a duplicate-pending constraint violation (23505).
    /// </summary>
    Task<InvitationEntity> CreateAsync(InvitationEntity invitation);

    /// <summary>Returns true if a pending invitation for the given match and invitee already exists.</summary>
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
    Task<InvitationEntity?> GetPendingByIdAsync(int invitationId, int userId);

    /// <summary>
    /// Atomically transitions the invitation status. The WHERE clause guards both ownership
    /// (invited_user_id = @UserId) and state (status = 'pending'), so concurrent requests
    /// for the same invitation are safe. Returns the number of rows updated (0 = already
    /// actioned, expired, or not owned by this user).
    /// </summary>
    Task<int> UpdateStatusAsync(int invitationId, int userId, string newStatus);

    /// <summary>
    /// Fetches the join-page preview and the accepted-players list in a single round-trip
    /// using QueryMultiple. Returns (null, empty) when the token is not found.
    /// </summary>
    Task<(InvitePreviewRow? Preview, IEnumerable<AcceptedPlayerRow> Players)> GetPreviewWithPlayersAsync(string token);

    /// <summary>
    /// Within a single transaction: inserts the user as a pending participant (no-op if
    /// already one), flips them to 'accepted' only when the match still has capacity, and
    /// marks the invitation accepted. Returns false when the match is full so the caller
    /// can throw ConflictException; true on success or when the player was already accepted.
    /// </summary>
    Task<bool> TryAcceptParticipantAndInvitationAsync(int matchId, int userId, int maxPlayers, int invitationId);
}

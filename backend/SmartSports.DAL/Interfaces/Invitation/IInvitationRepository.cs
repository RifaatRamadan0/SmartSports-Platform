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

    /// <summary>Returns the rich match preview for the join page, or null if token not found.</summary>
    Task<InvitePreviewRow?> GetPreviewByTokenAsync(string token);

    /// <summary>Returns accepted participants for a match (for the players list on the join page).</summary>
    Task<IEnumerable<AcceptedPlayerRow>> GetAcceptedPlayersAsync(int matchId);
}

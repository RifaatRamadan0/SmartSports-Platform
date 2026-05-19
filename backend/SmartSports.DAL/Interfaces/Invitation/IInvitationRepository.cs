using SmartSports.Domain.Entities.Projections;
using InvitationEntity = SmartSports.Domain.Entities.Invitation;

namespace SmartSports.DAL.Interfaces.Invitation;

public interface IInvitationRepository
{
    /// <summary>Returns an existing non-expired invite link for a match, or null if none exists.</summary>
    Task<InvitationEntity?> GetActiveByMatchIdAsync(int matchId);

    /// <summary>Returns the invitation by token, or null if not found.</summary>
    Task<InvitationEntity?> GetByTokenAsync(string token);

    /// <summary>Creates a new shareable invite link record.</summary>
    Task<InvitationEntity> CreateAsync(int matchId, int invitedById, string token, DateTime expiresAt);

    /// <summary>Returns the rich match preview for the join page, or null if token not found.</summary>
    Task<InvitePreviewRow?> GetPreviewByTokenAsync(string token);

    /// <summary>Returns accepted participants for a match (for the players list on the join page).</summary>
    Task<IEnumerable<AcceptedPlayerRow>> GetAcceptedPlayersAsync(int matchId);

    /// <summary>Returns the match start datetime (booking_date + start_time) for use as expires_at.</summary>
    Task<DateTime?> GetMatchStartTimeAsync(int matchId);
}

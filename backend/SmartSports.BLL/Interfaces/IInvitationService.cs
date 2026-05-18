using SmartSports.BLL.DTOs.Invitations;

namespace SmartSports.BLL.Interfaces;

public interface IInvitationService
{
    /// <summary>
    /// Sends an invitation to the named user for the given match.
    /// Only the booking owner may invite. Persists a pending invitation
    /// and a 'match_invitation' notification for the invitee.
    /// </summary>
    Task<InvitationResponse> InviteByUsernameAsync(int currentUserId, int matchId, string username);
}

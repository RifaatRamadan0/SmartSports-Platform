using SmartSports.BLL.DTOs.Invitations;

namespace SmartSports.BLL.Interfaces;

public interface IInvitationService
{
    /// <summary>
    /// Sends an invitation to the named user for the given match.
    /// The caller must already be in the match — either the booking owner
    /// or an accepted participant. Persists a pending invitation and a
    /// 'match_invitation' notification for the invitee.
    /// </summary>
    /// <param name="currentUsername">
    /// Display name of the caller, sourced from the JWT unique_name claim — used to
    /// compose the notification message without a second DB round-trip for the user row.
    /// </param>
    Task<InvitationResponse> InviteByUsernameAsync(
        int currentUserId, string currentUsername, int matchId, string username);
}

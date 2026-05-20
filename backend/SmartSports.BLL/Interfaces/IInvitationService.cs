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

    /// <summary>
    /// Returns all non-expired pending invitations addressed to the given user,
    /// enriched with match/pitch/sport/inviter details for display in the inbox.
    /// </summary>
    Task<IEnumerable<PendingInvitationDto>> GetPendingAsync(int userId);

    /// <summary>
    /// Accepts the invitation: adds the invitee to the match as an accepted participant
    /// and marks the related notification as read. Throws ConflictException when the
    /// invitation is not found, already actioned, or the match is at capacity.
    /// Throws ForbiddenException when the invitation does not belong to the caller.
    /// </summary>
    Task AcceptAsync(int invitationId, int userId);

    /// <summary>
    /// Declines the invitation and marks the related notification as read.
    /// Throws ConflictException when the invitation is not found or already actioned.
    /// Throws ForbiddenException when the invitation does not belong to the caller.
    /// </summary>
    Task DeclineAsync(int invitationId, int userId);
}

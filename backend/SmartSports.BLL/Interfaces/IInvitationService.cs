using SmartSports.BLL.DTOs.Invitations;

namespace SmartSports.BLL.Interfaces;

public interface IInvitationService
{
    /// <summary>
    /// Generates (or returns an existing) invite link for the match.
    /// Only the match organizer may call this.
    /// Throws KeyNotFoundException (404) if match not found,
    /// ForbiddenException (403) if caller is not the organizer.
    /// </summary>
    Task<InviteLinkResponse> GenerateInviteLinkAsync(int matchId, int callerUserId, string frontendBaseUrl);

    /// <summary>
    /// Returns the rich match preview for the join page.
    /// Throws KeyNotFoundException (404) if the token does not exist.
    /// </summary>
    Task<JoinPreviewResponse> GetJoinPreviewAsync(string token);

    /// <summary>
    /// Joins the match via the invite token. Creates a pending participant record.
    /// Throws KeyNotFoundException (404) if token not found,
    /// ArgumentException (400) if expired / already a participant / organizer / match full.
    /// </summary>
    Task JoinViaTokenAsync(string token, int callerUserId);

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

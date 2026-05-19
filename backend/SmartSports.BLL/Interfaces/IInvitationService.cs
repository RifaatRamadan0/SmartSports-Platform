using SmartSports.BLL.DTOs.Invitation;

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
    /// ArgumentException (400) if expired, already a participant, organizer, or match full.
    /// </summary>
    Task JoinViaTokenAsync(string token, int callerUserId);
}

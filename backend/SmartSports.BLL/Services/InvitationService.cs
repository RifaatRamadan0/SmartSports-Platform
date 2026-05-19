using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services;

public class InvitationService : IInvitationService
{
    private readonly IInvitationRepository _invitations;
    private readonly IMatchRepository      _matches;
    private readonly IUserRepository       _users;
    private readonly INotificationService  _notifications;

    public InvitationService(
        IInvitationRepository invitations,
        IMatchRepository      matches,
        IUserRepository       users,
        INotificationService  notifications)
    {
        _invitations   = invitations;
        _matches       = matches;
        _users         = users;
        _notifications = notifications;
    }

    public async Task<InvitationResponse> InviteByUsernameAsync(
        int currentUserId, string currentUsername, int matchId, string username)
    {
        // 1. Match must exist. GetByIdAsync joins bookings so BookingOwnerId,
        //    BookingStatus, and BookingDate are populated in one round-trip —
        //    see MatchRepository.GetByIdAsync.
        var match = await _matches.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} was not found.");

        // 2. Anyone in the match may invite — the booking owner, or any accepted
        //    participant. Pending invitees do NOT count; they haven't actually
        //    joined yet. IsAcceptedParticipantAsync runs only if the cheaper
        //    owner check fails.
        var isOwner = match.BookingOwnerId == currentUserId;
        if (!isOwner && !await _matches.IsAcceptedParticipantAsync(matchId, currentUserId))
            throw new ForbiddenException("Only players in this match can invite others.");

        // 3. Underlying booking must be active and in the future. A cancelled or
        //    past booking still has a matches row but should not accept invitations.
        if (match.BookingStatus != "confirmed")
            throw new ConflictException("This match's booking is not active.");
        if (match.BookingDate < DateOnly.FromDateTime(DateTime.Today))
            throw new ConflictException("This match has already taken place.");

        // 4. Invitee must exist.
        var invitee = await _users.GetByUsernameAsync(username)
            ?? throw new KeyNotFoundException($"User '{username}' was not found.");

        // 5. Cannot invite yourself.
        if (invitee.Id == currentUserId)
            throw new ArgumentException("You cannot invite yourself to your own match.");

        // 6. Cannot invite someone already in the match (counts accepted + pending
        //    participants only; rejected users can be re-invited).
        if (await _matches.IsParticipantAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' is already in this match.");

        // 7. Cannot send a duplicate pending invite. Partial unique index
        //    uq_invitations_pending (migration 022) backs this up against TOCTOU.
        if (await _invitations.ExistsPendingAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' already has a pending invitation to this match.");

        // 8. Persist the invitation. Token is required by the schema (it's the
        //    lookup key for shareable links in SPDBTCP-80); for username invites
        //    it's generated but never read.
        var invitation = new Invitation
        {
            MatchId       = matchId,
            InvitedById   = currentUserId,
            InvitedUserId = invitee.Id,
            Token         = Guid.NewGuid().ToString("N"),
            Status        = "pending"
        };
        var invitationId = await _invitations.CreateAsync(invitation);

        // 9. Notify the invitee. Inviter name comes from the JWT claim — no DB lookup.
        var inviterName = string.IsNullOrWhiteSpace(currentUsername) ? "Someone" : currentUsername;
        await _notifications.CreateAsync(
            userId:          invitee.Id,
            type:            "match_invitation",
            relatedEntityId: invitationId,
            message:         $"{inviterName} invited you to a match.");

        return new InvitationResponse
        {
            Id              = invitationId,
            MatchId         = matchId,
            InvitedUsername = invitee.Username,
            Status          = invitation.Status
        };
    }
}

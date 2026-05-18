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
        int currentUserId, int matchId, string username)
    {
        // 1. Match must exist. GetByIdAsync joins bookings so BookingOwnerId is populated
        //    in one round-trip — see MatchRepository.GetByIdAsync.
        var match = await _matches.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} was not found.");

        // 2. Only the booking owner may invite.
        if (match.BookingOwnerId != currentUserId)
            throw new ForbiddenException("Only the booking owner can invite players to this match.");

        // 3. Invitee must exist.
        var invitee = await _users.GetByUsernameAsync(username)
            ?? throw new KeyNotFoundException($"User '{username}' was not found.");

        // 4. Cannot invite yourself.
        if (invitee.Id == currentUserId)
            throw new ArgumentException("You cannot invite yourself to your own match.");

        // 5. Cannot invite someone already in the match.
        if (await _matches.IsParticipantAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' is already in this match.");

        // 6. Cannot send a duplicate pending invite.
        if (await _invitations.ExistsPendingAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' already has a pending invitation to this match.");

        // 7. Persist the invitation.
        var invitation = new Invitation
        {
            MatchId       = matchId,
            InvitedById   = currentUserId,
            InvitedUserId = invitee.Id,
            Token         = Guid.NewGuid().ToString("N"),
            Status        = "pending"
        };
        var invitationId = await _invitations.CreateAsync(invitation);

        // 8. Notify the invitee. Username lookup for the inviter to compose the message.
        var inviter = await _users.GetByIdAsync(currentUserId);
        var inviterName = inviter?.Username ?? "Someone";
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

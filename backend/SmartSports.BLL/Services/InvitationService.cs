using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Common;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services;

public class InvitationService : IInvitationService
{
    private readonly IInvitationRepository        _invitations;
    private readonly IMatchRepository             _matches;
    private readonly IUserRepository              _users;
    private readonly INotificationService         _notifications;
    private readonly IMatchParticipantRepository  _participants;

    public InvitationService(
        IInvitationRepository       invitations,
        IMatchRepository            matches,
        IUserRepository             users,
        INotificationService        notifications,
        IMatchParticipantRepository participants)
    {
        _invitations  = invitations;
        _matches      = matches;
        _users        = users;
        _notifications = notifications;
        _participants  = participants;
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
            type:            NotificationTypes.MatchInvitation,
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

    public async Task<IEnumerable<PendingInvitationDto>> GetPendingAsync(int userId)
    {
        var rows = await _invitations.GetPendingByUserIdAsync(userId);
        return rows.Select(r => new PendingInvitationDto
        {
            Id                 = r.InvitationId,
            MatchId            = r.MatchId,
            PitchName          = r.PitchName,
            SportName          = r.SportName,
            BookingDate        = r.BookingDate,
            StartTime          = r.StartTime,
            EndTime            = r.EndTime,
            InviterDisplayName = r.InviterDisplayName,
            ExpiresAt          = r.ExpiresAt,
            MaxPlayers         = r.MaxPlayers,
            SpotsLeft          = r.SpotsLeft,
            PricePerPlayer     = r.PricePerPlayer,
        });
    }

    public async Task AcceptAsync(int invitationId, int userId)
    {
        // 1. Verify the invitation exists, belongs to this user, and is still pending.
        //    Returns null when it's already actioned, expired, or doesn't belong to the caller.
        var invitation = await _invitations.GetPendingByIdAsync(invitationId, userId)
            ?? throw new ConflictException("Invitation not found, already actioned, or has expired.");

        // 2. Load match to get max_players for the capacity guard below.
        var match = await _matches.GetByIdAsync(invitation.MatchId)
            ?? throw new KeyNotFoundException($"Match {invitation.MatchId} no longer exists.");

        // 3. Add the player to the match as a pending participant (ConflictException from
        //    the UNIQUE constraint means they're already in the match — treat that as a
        //    no-op so the invitation can still be marked accepted).
        bool alreadyParticipant = false;
        try
        {
            await _participants.AddAsync(invitation.MatchId, userId);
        }
        catch (ConflictException)
        {
            alreadyParticipant = true;
        }

        if (!alreadyParticipant)
        {
            // 4. Atomically flip the participant to 'accepted' only when the match still has
            //    capacity. TryAcceptAsync returns false when the match is full or the row is
            //    no longer pending — both signal a capacity conflict.
            var accepted = await _participants.TryAcceptAsync(invitation.MatchId, userId, match.MaxPlayers);
            if (!accepted)
            {
                // Roll back the participant row we just inserted so the invitation can be
                // retried or the player can be told the match is full.
                await _participants.RemoveAsync(invitation.MatchId, userId);
                throw new ConflictException("This match is already full.");
            }
        }

        // 5. Mark invitation accepted — done AFTER the participant is confirmed so we never
        //    have an 'accepted' invitation without the corresponding participant row.
        await _invitations.UpdateStatusAsync(invitationId, userId, "accepted");

        // 6. Clear the inbox notification for this invitation.
        await _notifications.MarkReadByRelatedEntityAsync(userId, invitationId);
    }

    public async Task DeclineAsync(int invitationId, int userId)
    {
        // The guarded UPDATE returns 0 when the invitation is missing, already actioned,
        // expired, or doesn't belong to the caller — all of which are 409s from the
        // caller's perspective (the desired state is already the case or the resource is gone).
        var rows = await _invitations.UpdateStatusAsync(invitationId, userId, "declined");
        if (rows == 0)
            throw new ConflictException("Invitation not found, already actioned, or has expired.");

        await _notifications.MarkReadByRelatedEntityAsync(userId, invitationId);
    }
}

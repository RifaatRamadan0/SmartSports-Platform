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
    private readonly IInvitationRepository       _invitationRepository;
    private readonly IMatchRepository            _matchRepository;
    private readonly IMatchParticipantRepository _participantRepository;
    private readonly INotificationService        _notificationService;
    private readonly IUserRepository             _userRepository;

    public InvitationService(
        IInvitationRepository       invitationRepository,
        IMatchRepository            matchRepository,
        IMatchParticipantRepository participantRepository,
        INotificationService        notificationService,
        IUserRepository             userRepository)
    {
        _invitationRepository  = invitationRepository;
        _matchRepository       = matchRepository;
        _participantRepository = participantRepository;
        _notificationService   = notificationService;
        _userRepository        = userRepository;
    }

    public async Task<InviteLinkResponse> GenerateInviteLinkAsync(
        int matchId, int callerUserId, string frontendBaseUrl)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        if (match.BookingOwnerId != callerUserId)
            throw new ForbiddenException("Only the match organizer can generate an invite link.");

        // Fix #4: reject link generation for cancelled or past matches
        if (match.BookingStatus != "confirmed")
            throw new ConflictException("Cannot generate a link for an inactive match.");

        var existing = await _invitationRepository.GetActiveByMatchIdAsync(matchId);
        if (existing is not null)
            return new InviteLinkResponse(existing.Token, $"{frontendBaseUrl}/join/{existing.Token}");

        var expiresAt = match.BookingDate.ToDateTime(match.StartTime, DateTimeKind.Utc);

        try
        {
            var created = await _invitationRepository.CreateAsync(new Invitation
            {
                MatchId     = matchId,
                InvitedById = callerUserId,
                Token       = Guid.NewGuid().ToString("N"),
                ExpiresAt   = expiresAt,
                Status      = "pending"
                // InvitedUserId is intentionally null — this is a link invite, not a user-targeted one
            });

            return new InviteLinkResponse(created.Token, $"{frontendBaseUrl}/join/{created.Token}");
        }
        catch (ConflictException)
        {
            // Fix #6: two concurrent requests raced past GetActiveByMatchIdAsync and both tried
            // to insert. uq_invitations_link_pending caught the second — re-fetch the winner.
            var existing2 = await _invitationRepository.GetActiveByMatchIdAsync(matchId)
                ?? throw new ConflictException("Unable to generate invite link — please try again.");
            return new InviteLinkResponse(existing2.Token, $"{frontendBaseUrl}/join/{existing2.Token}");
        }
    }

    public async Task<JoinPreviewResponse> GetJoinPreviewAsync(string token)
    {
        // Fix #8: preview and accepted-players list fetched in a single round-trip
        var (preview, players) = await _invitationRepository.GetPreviewWithPlayersAsync(token);
        if (preview is null)
            throw new KeyNotFoundException("Invite link not found.");

        return new JoinPreviewResponse
        {
            MatchId         = preview.MatchId,
            SportName       = preview.SportName,
            MatchDate       = preview.MatchDate,
            StartTime       = preview.StartTime,
            EndTime         = preview.EndTime,
            PitchName       = preview.PitchName,
            CityName        = preview.CityName,
            OrganizerName   = preview.OrganizerName,
            MaxPlayers      = preview.MaxPlayers,
            CurrentPlayers  = preview.CurrentPlayers,
            SpotsLeft       = Math.Max(0, preview.MaxPlayers - preview.CurrentPlayers),
            PricePerPlayer  = preview.PricePerPlayer,
            IsExpired       = preview.IsExpired,
            IsOpenToJoin    = preview.IsOpenToJoin,
            AcceptedPlayers = players.Select(p => new AcceptedPlayer(p.Username)),
        };
    }

    public async Task JoinViaTokenAsync(string token, int callerUserId)
    {
        var invitation = await _invitationRepository.GetByTokenAsync(token)
            ?? throw new KeyNotFoundException("Invite link not found.");

        if (invitation.ExpiresAt.HasValue && invitation.ExpiresAt.Value < DateTime.UtcNow)
            throw new ArgumentException("This invite link has expired.");

        var match = await _matchRepository.GetByIdAsync(invitation.MatchId)
            ?? throw new KeyNotFoundException($"Match {invitation.MatchId} not found.");

        // Fix #3: guard cancelled bookings and past matches — same checks as InviteByUsernameAsync
        if (match.BookingStatus != "confirmed")
            throw new ConflictException("This match's booking is no longer active.");
        if (match.BookingDate < DateOnly.FromDateTime(DateTime.Today))
            throw new ConflictException("This match has already taken place.");

        if (match.BookingOwnerId == callerUserId)
            throw new ArgumentException("You are the organizer of this match.");

        // IsParticipantAsync runs SELECT EXISTS — cheaper than fetching the full row
        if (await _matchRepository.IsParticipantAsync(invitation.MatchId, callerUserId))
            throw new ArgumentException("You are already in this match.");

        var acceptedCount = await _participantRepository.GetAcceptedCountAsync(invitation.MatchId);
        if (acceptedCount >= match.MaxPlayers)
            throw new ArgumentException("This match is full.");

        // Public matches (IsOpenToJoin = true) bypass organizer approval: the link
        // is just a convenient discovery channel for something already publicly joinable.
        // Private matches keep the request → approve flow so the organizer stays in control.
        if (match.IsOpenToJoin)
        {
            await _participantRepository.AddAcceptedAsync(invitation.MatchId, callerUserId);

            await _notificationService.CreateAsync(
                match.BookingOwnerId!.Value,
                NotificationTypes.MatchJoined,
                invitation.MatchId,
                "A player joined your match via an invite link.");
        }
        else
        {
            await _participantRepository.AddAsync(invitation.MatchId, callerUserId);

            // relatedEntityId points to the match, not the invitation row — the organizer
            // needs to navigate to the match to accept or reject the join request.
            await _notificationService.CreateAsync(
                match.BookingOwnerId!.Value,
                NotificationTypes.MatchJoinRequested,
                invitation.MatchId,
                "A player has requested to join your match via an invite link.");
        }
    }

    public async Task<InvitationResponse> InviteByUsernameAsync(
        int currentUserId, string currentUsername, int matchId, string username)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} was not found.");

        var isOwner = match.BookingOwnerId == currentUserId;
        if (!isOwner && !await _matchRepository.IsAcceptedParticipantAsync(matchId, currentUserId))
            throw new ForbiddenException("Only players in this match can invite others.");

        if (match.BookingStatus != "confirmed")
            throw new ConflictException("This match's booking is not active.");
        if (match.BookingDate < DateOnly.FromDateTime(DateTime.Today))
            throw new ConflictException("This match has already taken place.");

        var invitee = await _userRepository.GetByUsernameAsync(username)
            ?? throw new KeyNotFoundException($"User '{username}' was not found.");

        if (invitee.Id == currentUserId)
            throw new ArgumentException("You cannot invite yourself to your own match.");

        if (await _matchRepository.IsParticipantAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' is already in this match.");

        if (await _invitationRepository.ExistsPendingAsync(matchId, invitee.Id))
            throw new ConflictException($"'{invitee.Username}' already has a pending invitation to this match.");

        var created = await _invitationRepository.CreateAsync(new Invitation
        {
            MatchId       = matchId,
            InvitedById   = currentUserId,
            InvitedUserId = invitee.Id,
            Token         = Guid.NewGuid().ToString("N"),
            Status        = "pending"
        });

        var inviterName = string.IsNullOrWhiteSpace(currentUsername) ? "Someone" : currentUsername;
        await _notificationService.CreateAsync(
            invitee.Id,
            NotificationTypes.MatchInvitation,
            created.Id,
            $"{inviterName} invited you to a match.");

        return new InvitationResponse
        {
            Id              = created.Id,
            MatchId         = matchId,
            InvitedUsername = invitee.Username,
            Status          = created.Status
        };
    }

    public async Task<IEnumerable<PendingInvitationDto>> GetPendingAsync(int userId)
    {
        var rows = await _invitationRepository.GetPendingByUserIdAsync(userId);
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
        var invitation = await _invitationRepository.GetPendingByIdAsync(invitationId, userId)
            ?? throw new ConflictException("Invitation not found, already actioned, or has expired.");

        // 2. Load match to get max_players for the capacity guard.
        var match = await _matchRepository.GetByIdAsync(invitation.MatchId)
            ?? throw new KeyNotFoundException($"Match {invitation.MatchId} no longer exists.");

        // Fix #5: steps 3-5 (insert participant, capacity-guard accept, mark invitation) run
        // inside a single transaction — a failure in any step rolls back all three, eliminating
        // the window where a player could be accepted without the invitation being marked.
        var accepted = await _invitationRepository.TryAcceptParticipantAndInvitationAsync(
            invitation.MatchId, userId, match.MaxPlayers, invitationId);

        if (!accepted)
            throw new ConflictException("This match is already full.");

        // Notification cleanup is non-critical and intentionally outside the transaction.
        await _notificationService.MarkReadByRelatedEntityAsync(userId, invitationId);
    }

    public async Task DeclineAsync(int invitationId, int userId)
    {
        // The guarded UPDATE returns 0 when the invitation is missing, already actioned,
        // expired, or doesn't belong to the caller — all of which are 409s from the
        // caller's perspective (the desired state is already the case or the resource is gone).
        var rows = await _invitationRepository.UpdateStatusAsync(invitationId, userId, "declined");
        if (rows == 0)
            throw new ConflictException("Invitation not found, already actioned, or has expired.");

        await _notificationService.MarkReadByRelatedEntityAsync(userId, invitationId);
    }
}

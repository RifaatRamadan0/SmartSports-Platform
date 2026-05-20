using SmartSports.BLL.DTOs.Invitations;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.DAL.Interfaces.Match;
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

        var existing = await _invitationRepository.GetActiveByMatchIdAsync(matchId);
        if (existing is not null)
            return new InviteLinkResponse(existing.Token, $"{frontendBaseUrl}/join/{existing.Token}");

        // Expire the link at match start — start_time is already in the GetByIdAsync join,
        // so no second DB call is needed.
        var expiresAt = match.BookingDate.ToDateTime(match.StartTime, DateTimeKind.Utc);

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

    public async Task<JoinPreviewResponse> GetJoinPreviewAsync(string token)
    {
        var preview = await _invitationRepository.GetPreviewByTokenAsync(token)
            ?? throw new KeyNotFoundException("Invite link not found.");

        var acceptedPlayers = await _invitationRepository.GetAcceptedPlayersAsync(preview.MatchId);

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
            AcceptedPlayers = acceptedPlayers.Select(p => new AcceptedPlayer(p.UserId, p.Username)),
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

        if (match.BookingOwnerId == callerUserId)
            throw new ArgumentException("You are the organizer of this match.");

        // IsParticipantAsync runs SELECT EXISTS — cheaper than fetching the full row
        if (await _matchRepository.IsParticipantAsync(invitation.MatchId, callerUserId))
            throw new ArgumentException("You are already in this match.");

        var acceptedCount = await _participantRepository.GetAcceptedCountAsync(invitation.MatchId);
        if (acceptedCount >= match.MaxPlayers)
            throw new ArgumentException("This match is full.");

        await _participantRepository.AddAsync(invitation.MatchId, callerUserId);

        // relatedEntityId points to the match, not the invitation row — the organizer
        // needs to navigate to the match to accept or reject the join request.
        await _notificationService.CreateAsync(
            match.BookingOwnerId!.Value,
            NotificationTypes.MatchJoinRequested,
            invitation.MatchId,
            "A player has requested to join your match via an invite link.");
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
}

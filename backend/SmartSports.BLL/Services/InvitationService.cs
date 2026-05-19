using SmartSports.BLL.DTOs.Invitation;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Invitation;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services;

public class InvitationService : IInvitationService
{
    private readonly IInvitationRepository     _invitationRepository;
    private readonly IMatchRepository          _matchRepository;
    private readonly IMatchParticipantRepository _participantRepository;
    private readonly INotificationService      _notificationService;

    public InvitationService(
        IInvitationRepository     invitationRepository,
        IMatchRepository          matchRepository,
        IMatchParticipantRepository participantRepository,
        INotificationService      notificationService)
    {
        _invitationRepository  = invitationRepository;
        _matchRepository       = matchRepository;
        _participantRepository = participantRepository;
        _notificationService   = notificationService;
    }

    public async Task<InviteLinkResponse> GenerateInviteLinkAsync(
        int matchId, int callerUserId, string frontendBaseUrl)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        if (match.BookingOwnerId != callerUserId)
            throw new ForbiddenException("Only the match organizer can generate an invite link.");

        // Return the existing active link if one already exists (avoid token sprawl)
        var existing = await _invitationRepository.GetActiveByMatchIdAsync(matchId);
        if (existing is not null)
        {
            var existingUrl = $"{frontendBaseUrl}/join/{existing.Token}";
            return new InviteLinkResponse(existing.Token, existingUrl);
        }

        var expiresAt = await _invitationRepository.GetMatchStartTimeAsync(matchId)
            ?? throw new KeyNotFoundException($"Could not determine start time for match {matchId}.");

        var token = Guid.NewGuid().ToString("N");
        var invitation = await _invitationRepository.CreateAsync(matchId, callerUserId, token, expiresAt);

        var shareUrl = $"{frontendBaseUrl}/join/{invitation.Token}";
        return new InviteLinkResponse(invitation.Token, shareUrl);
    }

    public async Task<JoinPreviewResponse> GetJoinPreviewAsync(string token)
    {
        var preview = await _invitationRepository.GetPreviewByTokenAsync(token)
            ?? throw new KeyNotFoundException("Invite link not found.");

        var acceptedPlayers = await _invitationRepository.GetAcceptedPlayersAsync(preview.MatchId);

        return new JoinPreviewResponse
        {
            MatchId        = preview.MatchId,
            SportName      = preview.SportName,
            MatchDate      = preview.MatchDate,
            StartTime      = preview.StartTime,
            EndTime        = preview.EndTime,
            PitchName      = preview.PitchName,
            CityName       = preview.CityName,
            OrganizerName  = preview.OrganizerName,
            MaxPlayers     = preview.MaxPlayers,
            CurrentPlayers = preview.CurrentPlayers,
            SpotsLeft      = Math.Max(0, preview.MaxPlayers - preview.CurrentPlayers),
            PricePerPlayer = preview.PricePerPlayer,
            IsExpired      = preview.IsExpired,
            AcceptedPlayers = acceptedPlayers.Select(p => new AcceptedPlayer(p.UserId, p.Username)),
        };
    }

    public async Task JoinViaTokenAsync(string token, int callerUserId)
    {
        var invitation = await _invitationRepository.GetByTokenAsync(token)
            ?? throw new KeyNotFoundException("Invite link not found.");

        var isExpired = invitation.ExpiresAt.HasValue
            && invitation.ExpiresAt.Value < DateTime.UtcNow;

        if (isExpired)
            throw new ArgumentException("This invite link has expired.");

        var match = await _matchRepository.GetByIdAsync(invitation.MatchId)
            ?? throw new KeyNotFoundException($"Match {invitation.MatchId} not found.");

        if (match.BookingOwnerId == callerUserId)
            throw new ArgumentException("You are the organizer of this match.");

        var existing = await _participantRepository.GetAsync(invitation.MatchId, callerUserId);
        if (existing is not null)
            throw new ArgumentException("You are already in this match.");

        var acceptedCount = await _participantRepository.GetAcceptedCountAsync(invitation.MatchId);
        if (acceptedCount >= match.MaxPlayers)
            throw new ArgumentException("This match is full.");

        await _participantRepository.AddAsync(invitation.MatchId, callerUserId);

        await _notificationService.NotifyAsync(
            match.BookingOwnerId!.Value,
            "A player has requested to join your match via an invite link.",
            "match_join_requested",
            invitation.MatchId);
    }
}

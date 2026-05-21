using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Match;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Common;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Exceptions;
using MatchEntity = SmartSports.Domain.Entities.Match;

namespace SmartSports.BLL.Services;

public class MatchService : IMatchService
{
    private readonly IMatchRepository            _matchRepository;
    private readonly IMatchParticipantRepository _participantRepository;
    private readonly INotificationService        _notificationService;

    public MatchService(
        IMatchRepository            matchRepository,
        IMatchParticipantRepository participantRepository,
        INotificationService        notificationService)
    {
        _matchRepository       = matchRepository;
        _participantRepository = participantRepository;
        _notificationService   = notificationService;
    }

    public async Task<MatchResponse?> GetByIdAsync(int matchId)
    {
        var match = await _matchRepository.GetByIdAsync(matchId);
        return match is null ? null : MapToResponse(match);
    }

    // SPDBTCP-246
    public async Task<MatchResponse> UpdateVisibilityAsync(int callerUserId, int matchId, bool isOpenToJoin)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        // Resource-level authorization: only the booking owner (the player who created
        // the underlying booking) may flip the visibility flag.
        if (match.BookingOwnerId != callerUserId)
            throw new ForbiddenException("You are not allowed to change this match's visibility.");

        // Idempotent: no write needed if the requested state matches the current state.
        if (match.IsOpenToJoin == isOpenToJoin)
            return MapToResponse(match);

        var updated = await _matchRepository.UpdateVisibilityAsync(matchId, isOpenToJoin);
        if (!updated)
            throw new KeyNotFoundException($"Match {matchId} not found.");

        match.IsOpenToJoin = isOpenToJoin;
        return MapToResponse(match);
    }

    public async Task<PagedResult<MatchSummaryResponse>> ListOpenAsync(MatchQuery query)
    {
        // Clamp to safe bounds — prevents runaway queries from bad client input
        var page     = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize < 1 ? 10 : query.PageSize, 1, 100);

        var filters = new MatchFilterParams(
            Sport:    query.Sport?.Trim(),
            City:     query.City?.Trim(),
            Page:     page,
            PageSize: pageSize
        );

        var (rows, total) = await _matchRepository.ListOpenAsync(filters);

        return new PagedResult<MatchSummaryResponse>
        {
            Items = rows.Select(r => new MatchSummaryResponse
            {
                MatchId        = r.MatchId,
                PitchName      = r.PitchName,
                CityName       = r.CityName,
                SportName      = r.SportName,
                BookingDate    = r.BookingDate,
                StartTime      = r.StartTime,
                EndTime        = r.EndTime,
                AcceptedCount  = r.AcceptedCount,
                MaxPlayers     = r.MaxPlayers,
                OrganizerName  = r.OrganizerName,
                OrganizerId    = r.OrganizerId,
                TotalPrice     = r.TotalPrice,
                PricePerPlayer = r.PricePerPlayer,
            }),
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
    }

    public async Task<IEnumerable<MyMatchSummaryResponse>> ListMyAsync(int callerUserId)
    {
        var rows = await _matchRepository.ListMyAsync(callerUserId);
        return rows.Select(r => new MyMatchSummaryResponse
        {
            MatchId        = r.MatchId,
            PitchName      = r.PitchName,
            CityName       = r.CityName,
            SportName      = r.SportName,
            BookingDate    = r.BookingDate,
            StartTime      = r.StartTime,
            EndTime        = r.EndTime,
            AcceptedCount  = r.AcceptedCount,
            MaxPlayers     = r.MaxPlayers,
            OrganizerName  = r.OrganizerName,
            OrganizerId    = r.OrganizerId,
            TotalPrice     = r.TotalPrice,
            PricePerPlayer = r.PricePerPlayer,
            MyRole         = r.MyRole,
            MyStatus       = r.MyStatus,
        });
    }

    public async Task<MatchStatsResponse> GetStatsAsync()
    {
        var (summary, bySport, byCity) = await _matchRepository.GetStatsAsync();

        return new MatchStatsResponse
        {
            OpenGamesCount = (int)Math.Min(summary.OpenGamesCount, int.MaxValue),
            CitiesCount    = (int)Math.Min(summary.CitiesCount,    int.MaxValue),
            BySport        = bySport.Select(r => new NameCountItem { Name = r.Name, Count = r.Count }),
            ByCity         = byCity.Select(r  => new NameCountItem { Name = r.Name, Count = r.Count }),
        };
    }

    public async Task<IEnumerable<PendingJoinRequestDto>> GetPendingJoinRequestsAsync(int organizerUserId)
    {
        var rows = await _participantRepository.GetPendingByOrganizerAsync(organizerUserId);
        return rows.Select(r => new PendingJoinRequestDto
        {
            ParticipantId   = r.ParticipantId,
            MatchId         = r.MatchId,
            RequesterUserId = r.RequesterUserId,
            RequesterName   = r.RequesterName,
            PitchName       = r.PitchName,
            SportName       = r.SportName,
            BookingDate     = r.BookingDate,
            StartTime       = r.StartTime,
            EndTime         = r.EndTime,
            MaxPlayers      = r.MaxPlayers,
            SpotsLeft       = r.SpotsLeft,
            PricePerPlayer  = r.PricePerPlayer,
        });
    }

    public async Task<MatchParticipantResponse> JoinAsync(int callerUserId, int matchId)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        if (!match.IsOpenToJoin)
            throw new ArgumentException("This match is not open to join.");

        if (match.BookingOwnerId == callerUserId)
            throw new ArgumentException("You cannot join your own match.");

        var acceptedCount = await _participantRepository.GetAcceptedCountAsync(matchId);
        if (acceptedCount >= match.MaxPlayers)
            throw new ArgumentException("This match is full.");

        // Public matches auto-accept — the IsOpenToJoin guard above means we only
        // reach this point for matches the organizer has already marked joinable.
        // The invite-link path (InvitationService.JoinViaTokenAsync) uses the same rule.
        // ConflictException from the UNIQUE constraint is surfaced as-is (409).
        var participant = await _participantRepository.AddAcceptedAsync(matchId, callerUserId);

        await _notificationService.CreateAsync(
            match.BookingOwnerId!.Value,
            NotificationTypes.MatchJoined,
            matchId,
            "A player joined your match.");

        return MapParticipant(participant);
    }

    public async Task<MatchParticipantResponse?> GetMyStatusAsync(int callerUserId, int matchId)
    {
        var participant = await _participantRepository.GetAsync(matchId, callerUserId);
        return participant is null ? null : MapParticipant(participant);
    }

    public async Task LeaveAsync(int callerUserId, int matchId)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        var participant = await _participantRepository.GetAsync(matchId, callerUserId)
            ?? throw new KeyNotFoundException("You are not a participant of this match.");

        await _participantRepository.RemoveAsync(matchId, callerUserId);

        if (participant.Status == "accepted")
        {
            await _notificationService.CreateAsync(
                match.BookingOwnerId!.Value,
                NotificationTypes.MatchPlayerLeft,
                matchId,
                "A player has left your match.");
        }
    }

    public async Task<MatchParticipantResponse> RespondToParticipantAsync(
        int callerUserId, int matchId, int participantUserId, string action)
    {
        var match = await _matchRepository.GetByIdAsync(matchId)
            ?? throw new KeyNotFoundException($"Match {matchId} not found.");

        if (match.BookingOwnerId != callerUserId)
            throw new ForbiddenException("Only the match organizer can respond to join requests.");

        if (action != "accept" && action != "reject")
            throw new ArgumentException("Action must be 'accept' or 'reject'.");

        var participant = await _participantRepository.GetAsync(matchId, participantUserId)
            ?? throw new KeyNotFoundException("Participant not found.");

        if (action == "accept")
        {
            // Atomic capacity-guarded accept — see IMatchParticipantRepository.TryAcceptAsync.
            // Prevents a TOCTOU race where two concurrent organizer requests both observe
            // accepted < max and both succeed, overfilling the match.
            var accepted = await _participantRepository.TryAcceptAsync(matchId, participantUserId, match.MaxPlayers);
            if (!accepted)
                throw new ArgumentException("Cannot accept: participant is not pending, or match is already full.");
            participant.Status = "accepted";
        }
        else
        {
            // Hard-delete on reject so the player isn't permanently locked out by the
            // UNIQUE (match_id, user_id) constraint. They can request again later.
            await _participantRepository.RemoveAsync(matchId, participantUserId);
            participant.Status = "rejected";
        }

        var notifType    = action == "accept" ? NotificationTypes.MatchJoinAccepted : NotificationTypes.MatchJoinRejected;
        var notifMessage = action == "accept"
            ? "Your request to join the match has been accepted."
            : "Your request to join the match has been rejected.";

        await _notificationService.CreateAsync(participantUserId, notifType, matchId, notifMessage);

        return MapParticipant(participant);
    }

    private static MatchResponse MapToResponse(MatchEntity match) => new()
    {
        Id           = match.Id,
        BookingId    = match.BookingId,
        IsOpenToJoin = match.IsOpenToJoin,
        MaxPlayers   = match.MaxPlayers,
    };

    private static MatchParticipantResponse MapParticipant(MatchParticipant p) =>
        new(p.Id, p.MatchId, p.UserId, p.Status);
}

using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Match;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Exceptions;
using MatchEntity = SmartSports.Domain.Entities.Match;

namespace SmartSports.BLL.Services;

public class MatchService : IMatchService
{
    private readonly IMatchRepository _matchRepository;

    public MatchService(IMatchRepository matchRepository)
    {
        _matchRepository = matchRepository;
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
                TotalPrice     = r.TotalPrice,
                PricePerPlayer = r.PricePerPlayer,
            }),
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
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

    private static MatchResponse MapToResponse(MatchEntity match) => new()
    {
        Id           = match.Id,
        BookingId    = match.BookingId,
        IsOpenToJoin = match.IsOpenToJoin,
        MaxPlayers   = match.MaxPlayers,
    };
}

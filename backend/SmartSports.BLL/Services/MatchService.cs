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
        if (query.Page     < 1)   query.Page     = 1;
        if (query.PageSize < 1)   query.PageSize = 10;
        if (query.PageSize > 100) query.PageSize = 100;

        var filters = new MatchFilterParams(
            Sport:    query.Sport?.Trim(),
            City:     query.City?.Trim(),
            Page:     query.Page,
            PageSize: query.PageSize
        );

        var (rows, total) = await _matchRepository.ListOpenAsync(filters);

        return new PagedResult<MatchSummaryResponse>
        {
            Items = rows.Select(r => new MatchSummaryResponse
            {
                MatchId       = r.MatchId,
                PitchName     = r.PitchName,
                CityName      = r.CityName,
                SportName     = r.SportName,
                BookingDate   = r.BookingDate,
                StartTime     = r.StartTime,
                EndTime       = r.EndTime,
                AcceptedCount = r.AcceptedCount,
                MaxPlayers    = r.MaxPlayers,
            }),
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = query.Page,
            PageSize   = query.PageSize,
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

using SmartSports.BLL.DTOs.Match;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Match;
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

    // SPDBTCP-246 — Rifaat
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

    private static MatchResponse MapToResponse(MatchEntity match) => new()
    {
        Id           = match.Id,
        BookingId    = match.BookingId,
        IsOpenToJoin = match.IsOpenToJoin,
        MaxPlayers   = match.MaxPlayers,
    };
}

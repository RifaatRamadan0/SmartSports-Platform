using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Match;

namespace SmartSports.BLL.Interfaces;

public interface IMatchService
{
    // SPDBTCP-246
    /// <summary>
    /// Returns the match by id, or null if not found.
    /// </summary>
    Task<MatchResponse?> GetByIdAsync(int matchId);

    /// <summary>
    /// Sets the match visibility (open / private). Only the booking owner can change it.
    /// Throws KeyNotFoundException (404) if the match does not exist, ForbiddenException (403)
    /// if the caller is not the booking owner. Idempotent: if the new state matches the current
    /// state the call is a no-op and still returns 200.
    /// </summary>
    Task<MatchResponse> UpdateVisibilityAsync(int callerUserId, int matchId, bool isOpenToJoin);

    /// <summary>
    /// Returns a paginated list of open matches filterable by sport and city,
    /// ordered by upcoming date. A match is open when is_open_to_join=TRUE,
    /// booking date >= today, and accepted participants &lt; max_players.
    /// </summary>
    Task<PagedResult<MatchSummaryResponse>> ListOpenAsync(MatchQuery query);
}

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

    /// <summary>
    /// Returns aggregate stats for all open matches: total count, distinct city count,
    /// minimum price per player, and per-sport and per-city breakdowns.
    /// </summary>
    Task<MatchStatsResponse> GetStatsAsync();

    /// <summary>
    /// Creates a pending join request for the calling player.
    /// Throws ArgumentException (400) if the match is closed, full, or the player is the organizer,
    /// or if a request already exists. Notifies the organizer on success.
    /// </summary>
    Task<MatchParticipantResponse> JoinAsync(int callerUserId, int matchId);

    /// <summary>
    /// Returns the current user's participant record for the match, or null if they have not joined.
    /// </summary>
    Task<MatchParticipantResponse?> GetMyStatusAsync(int callerUserId, int matchId);

    /// <summary>
    /// Removes the caller's participant record. If the record was accepted, the organizer is notified.
    /// Throws KeyNotFoundException (404) if the caller is not a participant.
    /// </summary>
    Task LeaveAsync(int callerUserId, int matchId);

    /// <summary>
    /// Accepts or rejects a pending join request. Only the match organizer may call this.
    /// Throws ForbiddenException (403) if the caller is not the organizer,
    /// KeyNotFoundException (404) if the participant is not found,
    /// ArgumentException (400) if action is invalid or the match is full on accept.
    /// </summary>
    Task<MatchParticipantResponse> RespondToParticipantAsync(int callerUserId, int matchId, int participantUserId, string action);
}

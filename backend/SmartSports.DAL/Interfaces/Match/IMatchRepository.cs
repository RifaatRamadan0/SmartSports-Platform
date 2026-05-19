using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Match;

public interface IMatchRepository
{
    /// <summary>
    /// Returns the match by id, joined to bookings so BookingOwnerId is populated
    /// (used for resource-level authorization in MatchService / InvitationService).
    /// </summary>
    Task<Domain.Entities.Match?> GetByIdAsync(int matchId);

    /// <summary>
    /// Returns the match for a given booking, joined to bookings so BookingOwnerId is populated.
    /// </summary>
    Task<Domain.Entities.Match?> GetByBookingIdAsync(int bookingId);

    /// <summary>
    /// Sets is_open_to_join on the match. Returns true if a row was updated.
    /// </summary>
    Task<bool> UpdateVisibilityAsync(int matchId, bool isOpenToJoin);

    /// <summary>
    /// Returns true if the given user is already a participant in the match.
    /// </summary>
    Task<bool> IsParticipantAsync(int matchId, int userId);

    /// <summary>
    /// Paginated list of open matches (is_open_to_join=TRUE, booking date >= today,
    /// accepted participants &lt; max_players). Optionally filtered by sport and city.
    /// Ordered by booking_date ASC, start_time ASC.
    /// </summary>
    Task<(IEnumerable<OpenMatchRow> Items, long TotalCount)> ListOpenAsync(MatchFilterParams filters);

    /// <summary>
    /// Aggregate stats for open matches: total count, distinct city count,
    /// and per-sport and per-city breakdowns.
    /// </summary>
    Task<(MatchStatsRow Summary, IEnumerable<MatchCountByName> BySport, IEnumerable<MatchCountByName> ByCity)> GetStatsAsync();
}

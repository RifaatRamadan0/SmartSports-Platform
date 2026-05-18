using SmartSports.Domain.Entities;

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
}

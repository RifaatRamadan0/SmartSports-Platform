namespace SmartSports.Domain.Entities.Projections;

/// <summary>
/// Result of cancelling a booking: the linked match id (null if the booking had no match
/// or the cancel was a no-op) and the user ids of every pending/accepted match participant,
/// so the caller can notify them that the match's booking was cancelled.
/// </summary>
public record BookingCancelResult(
    int?            MatchId,
    IReadOnlyList<int> ParticipantUserIds);

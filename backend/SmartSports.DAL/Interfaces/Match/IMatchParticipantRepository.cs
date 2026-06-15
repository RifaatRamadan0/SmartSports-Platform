using SmartSports.Domain.Entities;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Match;

public interface IMatchParticipantRepository
{
    Task<MatchParticipant>  AddAsync(int matchId, int userId);

    /// <summary>
    /// Inserts a participant already in the 'accepted' state. Used for join paths
    /// that bypass organizer approval — currently invite-link joins on public matches.
    /// </summary>
    Task<MatchParticipant>  AddAcceptedAsync(int matchId, int userId);

    /// <summary>
    /// Atomically inserts a participant as 'accepted' only if the match still has
    /// capacity. The count check and the insert happen in one statement, so two
    /// concurrent join requests cannot both succeed when only one spot remains.
    /// Returns the new row, or null if the match is already full.
    /// </summary>
    Task<MatchParticipant?> TryAddAcceptedAsync(int matchId, int userId, int maxPlayers);
    Task<MatchParticipant?> GetAsync(int matchId, int userId);
    Task<int>               GetAcceptedCountAsync(int matchId);
    Task<bool>              UpdateStatusAsync(int matchId, int userId, string status);
    Task<bool>              RemoveAsync(int matchId, int userId);

    /// <summary>
    /// Returns all pending join requests for every match organised by the given user
    /// (i.e. where the booking owner = organizerUserId), enriched with match/pitch/sport
    /// details and capacity numbers for display in the organiser inbox.
    /// </summary>
    Task<IEnumerable<PendingJoinRequestRow>> GetPendingByOrganizerAsync(int organizerUserId);

    /// <summary>
    /// Atomically flips a pending participant to 'accepted' only if the match
    /// still has capacity. The capacity check and the write happen in one
    /// statement, so two concurrent organizer requests cannot both succeed.
    /// Returns true when the row was updated; false when the participant is
    /// missing, no longer pending, or the match is already full.
    /// </summary>
    Task<bool>              TryAcceptAsync(int matchId, int userId, int maxPlayers);
}

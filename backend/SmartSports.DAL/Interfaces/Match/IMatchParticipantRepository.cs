using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Match;

public interface IMatchParticipantRepository
{
    Task<MatchParticipant>  AddAsync(int matchId, int userId);
    Task<MatchParticipant?> GetAsync(int matchId, int userId);
    Task<int>               GetAcceptedCountAsync(int matchId);
    Task<bool>              UpdateStatusAsync(int matchId, int userId, string status);
    Task<bool>              RemoveAsync(int matchId, int userId);

    /// <summary>
    /// Atomically flips a pending participant to 'accepted' only if the match
    /// still has capacity. The capacity check and the write happen in one
    /// statement, so two concurrent organizer requests cannot both succeed.
    /// Returns true when the row was updated; false when the participant is
    /// missing, no longer pending, or the match is already full.
    /// </summary>
    Task<bool>              TryAcceptAsync(int matchId, int userId, int maxPlayers);
}

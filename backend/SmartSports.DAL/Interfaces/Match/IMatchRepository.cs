namespace SmartSports.DAL.Interfaces.Match;

public interface IMatchRepository
{
    /// <summary>
    /// Returns the match by id, or null if it does not exist.
    /// </summary>
    Task<Domain.Entities.Match?> GetByIdAsync(int matchId);

    /// <summary>
    /// Returns the user id of the booking owner who controls this match,
    /// or null if no match with the given id exists.
    /// </summary>
    Task<int?> GetOwnerUserIdAsync(int matchId);

    /// <summary>
    /// Returns true if the given user is already a participant in the match.
    /// </summary>
    Task<bool> IsParticipantAsync(int matchId, int userId);
}

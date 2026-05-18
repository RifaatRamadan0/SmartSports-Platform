using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Match;

public interface IMatchParticipantRepository
{
    Task<MatchParticipant>  AddAsync(int matchId, int userId);
    Task<MatchParticipant?> GetAsync(int matchId, int userId);
    Task<int>               GetAcceptedCountAsync(int matchId);
    Task<bool>              UpdateStatusAsync(int matchId, int userId, string status);
    Task<bool>              RemoveAsync(int matchId, int userId);
}

using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Invitation;

public interface IInvitationRepository
{
    /// <summary>
    /// Inserts a new invitation row and returns the generated id.
    /// </summary>
    Task<int> CreateAsync(Domain.Entities.Invitation invitation);

    /// <summary>
    /// Returns true if a pending invitation for the given match and invitee already exists.
    /// </summary>
    Task<bool> ExistsPendingAsync(int matchId, int invitedUserId);
}

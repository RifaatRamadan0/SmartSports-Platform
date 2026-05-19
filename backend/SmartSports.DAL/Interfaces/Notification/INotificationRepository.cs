using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Notification;

public interface INotificationRepository
{
    /// <summary>
    /// Inserts a notification row for a user. Returns the generated id.
    /// </summary>
    Task<int> InsertAsync(Domain.Entities.Notification notification);
}

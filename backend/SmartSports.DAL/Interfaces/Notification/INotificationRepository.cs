using NotificationEntity = SmartSports.Domain.Entities.Notification;

namespace SmartSports.DAL.Interfaces.Notification;

public interface INotificationRepository
{
    Task<int> InsertAsync(NotificationEntity notification);
}

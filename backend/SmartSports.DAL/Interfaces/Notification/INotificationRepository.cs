using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Interfaces.Notification;

public interface INotificationRepository
{
    Task<int> InsertAsync(Notification notification);
}

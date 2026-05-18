namespace SmartSports.DAL.Interfaces.Notification;

public interface INotificationRepository
{
    Task CreateAsync(int userId, string message, string type, int? relatedEntityId = null);
}

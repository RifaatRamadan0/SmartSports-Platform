namespace SmartSports.BLL.Interfaces;

public interface INotificationService
{
    Task NotifyAsync(int userId, string message, string type, int? relatedEntityId = null);
}

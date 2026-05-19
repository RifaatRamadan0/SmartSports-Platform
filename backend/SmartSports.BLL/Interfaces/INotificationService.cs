namespace SmartSports.BLL.Interfaces;

public interface INotificationService
{
    Task CreateAsync(int userId, string type, int? relatedEntityId, string message);
}

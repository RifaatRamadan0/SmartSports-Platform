namespace SmartSports.BLL.Interfaces.Notification;

public interface INotificationService
{
    Task CreateAsync(int userId, string type, int? relatedEntityId, string message);

    /// <summary>
    /// Marks all unread notifications for this user that reference the given related entity
    /// as read. Called after a player accepts or declines an invitation so the badge count
    /// stays accurate.
    /// </summary>
    Task MarkReadByRelatedEntityAsync(int userId, int relatedEntityId);
}

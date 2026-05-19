namespace SmartSports.BLL.Interfaces;

public interface INotificationService
{
    /// <summary>
    /// Persists a notification row for the target user.
    /// </summary>
    /// <param name="userId">Recipient user id.</param>
    /// <param name="type">Must match the notification_type enum (e.g. "match_invitation").</param>
    /// <param name="relatedEntityId">Optional id of the entity that prompted the notification (e.g. invitation id).</param>
    /// <param name="message">Human-readable message shown in the inbox.</param>
    Task CreateAsync(int userId, string type, int? relatedEntityId, string message);
}

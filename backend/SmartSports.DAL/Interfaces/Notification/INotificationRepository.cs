using NotificationEntity = SmartSports.Domain.Entities.Notification;

namespace SmartSports.DAL.Interfaces.Notification;

public interface INotificationRepository
{
    Task<int> InsertAsync(NotificationEntity notification);

    /// <summary>
    /// Marks all unread notifications for the given user that are linked to a specific
    /// related entity (e.g. an invitation id) as read. Used after Accept/Decline so the
    /// inbox badge count stays accurate.
    /// </summary>
    Task MarkReadByRelatedEntityAsync(int userId, int relatedEntityId);
}

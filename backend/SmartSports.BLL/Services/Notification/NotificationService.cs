using SmartSports.BLL.Interfaces.Notification;
using SmartSports.DAL.Interfaces.Notification;

namespace SmartSports.BLL.Services.Notification;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.BLL.Services.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notifications;

    public NotificationService(INotificationRepository notifications)
    {
        _notifications = notifications;
    }

    public async Task CreateAsync(int userId, string type, int? relatedEntityId, string message)
    {
        await _notifications.InsertAsync(new Notification
        {
            UserId          = userId,
            Type            = type,
            RelatedEntityId = relatedEntityId,
            Message         = message
        });
    }

    public async Task MarkReadByRelatedEntityAsync(int userId, int relatedEntityId)
    {
        await _notifications.MarkReadByRelatedEntityAsync(userId, relatedEntityId);
    }
}

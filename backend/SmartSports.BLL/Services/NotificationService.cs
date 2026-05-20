using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Notification;
using SmartSports.Domain.Entities;

namespace SmartSports.BLL.Services;

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

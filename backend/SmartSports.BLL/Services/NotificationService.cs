using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Notification;

namespace SmartSports.BLL.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repo;

    public NotificationService(INotificationRepository repo)
    {
        _repo = repo;
    }

    public Task NotifyAsync(int userId, string message, string type, int? relatedEntityId = null)
        => _repo.CreateAsync(userId, message, type, relatedEntityId);
}

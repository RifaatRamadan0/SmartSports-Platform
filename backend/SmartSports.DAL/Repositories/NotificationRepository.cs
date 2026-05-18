using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Notification;

namespace SmartSports.DAL.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task CreateAsync(int userId, string message, string type, int? relatedEntityId = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            INSERT INTO notifications (user_id, message, type, related_entity_id)
            VALUES (@UserId, @Message, @Type::notification_type, @RelatedEntityId)
            """,
            new { UserId = userId, Message = message, Type = type, RelatedEntityId = relatedEntityId });
    }
}

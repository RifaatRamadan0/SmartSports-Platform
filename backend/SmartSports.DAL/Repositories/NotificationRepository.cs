using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Notification;
using NotificationEntity = SmartSports.Domain.Entities.Notification;

namespace SmartSports.DAL.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> InsertAsync(NotificationEntity notification)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO notifications
                (user_id, related_entity_id, message, type, is_read)
            VALUES
                (@UserId, @RelatedEntityId, @Message, @Type::notification_type, FALSE)
            RETURNING id
            """,
            notification);
    }

    public async Task MarkReadByRelatedEntityAsync(int userId, int relatedEntityId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(
            """
            UPDATE notifications
            SET    is_read = TRUE
            WHERE  user_id           = @UserId
              AND  related_entity_id = @RelatedEntityId
              AND  is_read           = FALSE
            """,
            new { UserId = userId, RelatedEntityId = relatedEntityId });
    }
}

using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.RoleRequests;
using SmartSports.Domain.Enums;

namespace SmartSports.DAL.Repositories.RoleRequest;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.DAL.Repositories.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class RoleRequestRepository : IRoleRequestRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public RoleRequestRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> CreateAsync(int userId, string requestedRole)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.ExecuteScalarAsync<int>(
                """
                INSERT INTO role_requests (user_id, requested_role, status)
                VALUES (@UserId, @RequestedRole, 0)
                RETURNING id
                """,
                new { UserId = userId, RequestedRole = requestedRole });
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            throw new ArgumentException("A pending request for this role already exists.");
        }
    }

    public async Task<IEnumerable<RoleRequest>> GetByUserAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<RoleRequest>(
            """
            SELECT id, user_id, requested_role, status, rejection_reason, created_at, processed_at, processed_by
            FROM   role_requests
            WHERE  user_id = @UserId
            ORDER BY created_at DESC
            """,
            new { UserId = userId });
    }

    public async Task<(IEnumerable<RoleRequest> Items, long TotalCount)> GetPendingAsync(int page, int pageSize)
    {
        using var connection = _connectionFactory.CreateConnection();
        var parameters = new { PageSize = pageSize, Offset = (page - 1) * pageSize };

        const string countSql = "SELECT COUNT(*) FROM role_requests WHERE status = 0";

        const string dataSql = """
            SELECT  rr.id, rr.user_id, rr.requested_role, rr.status,
                    rr.rejection_reason, rr.created_at, rr.processed_at, rr.processed_by,
                    u.username, u.email
            FROM    role_requests rr
            JOIN    users         u ON u.id = rr.user_id
            WHERE   rr.status = 0
            ORDER BY rr.created_at ASC
            LIMIT  @PageSize
            OFFSET @Offset
            """;

        var totalCount = await connection.ExecuteScalarAsync<long>(countSql);
        var items      = await connection.QueryAsync<RoleRequest>(dataSql, parameters);

        return (items, totalCount);
    }

    public async Task<RoleRequest?> GetByIdAsync(int requestId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<RoleRequest>(
            """
            SELECT id, user_id, requested_role, status, rejection_reason, created_at, processed_at, processed_by
            FROM   role_requests
            WHERE  id = @RequestId
            """,
            new { RequestId = requestId });
    }

    public async Task ApproveAsync(int requestId, int adminId, int roleId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Conditional UPDATE — only the first concurrent caller flips the row
            // from Pending; the rest get null back and bail out. RETURNING avoids
            // a separate SELECT and closes the TOCTOU window the prior version had.
            var userId = await connection.ExecuteScalarAsync<int?>(
                """
                UPDATE role_requests
                SET    status = 1, processed_at = NOW(), processed_by = @AdminId
                WHERE  id = @RequestId AND status = 0
                RETURNING user_id
                """,
                new { RequestId = requestId, AdminId = adminId }, transaction);

            if (userId is null)
                throw new KeyNotFoundException("Role request not found or already processed.");

            await connection.ExecuteAsync(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES (@UserId, @RoleId)
                ON CONFLICT DO NOTHING
                """,
                new { UserId = userId.Value, RoleId = roleId }, transaction);

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task RejectAsync(int requestId, int adminId, string? reason)
    {
        using var connection = _connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync(
            """
            UPDATE role_requests
            SET    status = 2, rejection_reason = @Reason,
                   processed_at = NOW(), processed_by = @AdminId
            WHERE  id = @RequestId AND status = 0
            """,
            new { RequestId = requestId, AdminId = adminId, Reason = reason });

        if (rows == 0)
            throw new KeyNotFoundException("Role request not found or already processed.");
    }
}

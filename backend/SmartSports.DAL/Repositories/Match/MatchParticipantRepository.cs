using Dapper;
using Npgsql;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Match;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Exceptions;

namespace SmartSports.DAL.Repositories.Match;
// Imported inside the namespace so entity types resolve before the sibling
// SmartSports.DAL.Repositories.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class MatchParticipantRepository : IMatchParticipantRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public MatchParticipantRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<MatchParticipant> AddAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.QuerySingleAsync<MatchParticipant>(
                """
                INSERT INTO match_participants (match_id, user_id)
                VALUES (@MatchId, @UserId)
                RETURNING *
                """,
                new { MatchId = matchId, UserId = userId });
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            throw new ConflictException("Already requested to join this match.");
        }
    }

    public async Task<MatchParticipant> AddAcceptedAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.QuerySingleAsync<MatchParticipant>(
                """
                INSERT INTO match_participants (match_id, user_id, status)
                VALUES (@MatchId, @UserId, 'accepted'::participant_status)
                RETURNING *
                """,
                new { MatchId = matchId, UserId = userId });
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            throw new ConflictException("Already in this match.");
        }
    }

    public async Task<MatchParticipant?> GetAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<MatchParticipant>(
            """
            SELECT * FROM match_participants
            WHERE match_id = @MatchId AND user_id = @UserId
            """,
            new { MatchId = matchId, UserId = userId });
    }

    public async Task<int> GetAcceptedCountAsync(int matchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*) FROM match_participants
            WHERE match_id = @MatchId AND status = 'accepted'
            """,
            new { MatchId = matchId });
    }

    public async Task<bool> UpdateStatusAsync(int matchId, int userId, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            """
            UPDATE match_participants
            SET    status = @Status::participant_status
            WHERE  match_id = @MatchId AND user_id = @UserId
            """,
            new { MatchId = matchId, UserId = userId, Status = status });
        return rows > 0;
    }

    public async Task<MatchParticipant?> TryAddAcceptedAsync(int matchId, int userId, int maxPlayers)
    {
        using var connection = _connectionFactory.CreateConnection();
        try
        {
            return await connection.QuerySingleOrDefaultAsync<MatchParticipant>(
                """
                INSERT INTO match_participants (match_id, user_id, status)
                SELECT @MatchId, @UserId, 'accepted'::participant_status
                WHERE (
                    SELECT COUNT(*) FROM match_participants
                    WHERE match_id = @MatchId AND status = 'accepted'
                ) < @MaxPlayers
                RETURNING *
                """,
                new { MatchId = matchId, UserId = userId, MaxPlayers = maxPlayers });
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            throw new ConflictException("Already in this match.");
        }
    }

    public async Task<bool> TryAcceptAsync(int matchId, int userId, int maxPlayers)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            """
            UPDATE match_participants
            SET    status = 'accepted'::participant_status
            WHERE  match_id = @MatchId
              AND  user_id  = @UserId
              AND  status   = 'pending'::participant_status
              AND  (
                SELECT COUNT(*) FROM match_participants
                WHERE  match_id = @MatchId AND status = 'accepted'
              ) < @MaxPlayers
            """,
            new { MatchId = matchId, UserId = userId, MaxPlayers = maxPlayers });
        return rows > 0;
    }

    public async Task<bool> RemoveAsync(int matchId, int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            """
            DELETE FROM match_participants
            WHERE match_id = @MatchId AND user_id = @UserId
            """,
            new { MatchId = matchId, UserId = userId });
        return rows > 0;
    }

    public async Task<IEnumerable<PendingJoinRequestRow>> GetPendingByOrganizerAsync(int organizerUserId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<PendingJoinRequestRow>(
            """
            SELECT mp.id            AS ParticipantId,
                   mp.match_id      AS MatchId,
                   mp.user_id       AS RequesterUserId,
                   u.username       AS RequesterName,
                   p.name           AS PitchName,
                   st.name          AS SportName,
                   b.booking_date   AS BookingDate,
                   b.start_time     AS StartTime,
                   b.end_time       AS EndTime,
                   m.max_players    AS MaxPlayers,
                   (m.max_players - ac.cnt)::int AS SpotsLeft,
                   ROUND(b.total_price / NULLIF(m.max_players, 0), 2) AS PricePerPlayer
            FROM   match_participants mp
            JOIN   matches       m  ON m.id  = mp.match_id
            JOIN   bookings      b  ON b.id  = m.booking_id
            JOIN   pitches       p  ON p.id  = b.pitch_id
            JOIN   sport_types   st ON st.id = p.sport_type_id
            JOIN   users         u  ON u.id  = mp.user_id
            JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt FROM match_participants
                WHERE  match_id = m.id AND status = 'accepted'
            ) ac ON TRUE
            WHERE  b.user_id       = @OrganizerUserId
              AND  mp.status       = 'pending'
              AND  b.booking_date >= CURRENT_DATE
            ORDER  BY mp.id DESC
            """,
            new { OrganizerUserId = organizerUserId });
    }
}

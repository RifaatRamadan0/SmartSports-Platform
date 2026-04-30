using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Entities;

namespace SmartSports.DAL.Repositories;

public class PitchScheduleRepository : IPitchScheduleRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PitchScheduleRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<PitchWeeklySchedule>> GetByPitchIdAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string query = @"
            SELECT id, pitch_id, day_of_week, open_time, close_time, is_active
            FROM pitch_weekly_schedules
            WHERE pitch_id = @PitchId
            ORDER BY day_of_week ASC";

        return await connection.QueryAsync<PitchWeeklySchedule>(query, new { PitchId = pitchId });
    }

    /// <inheritdoc />
    public async Task UpsertAsync(int pitchId, IEnumerable<PitchWeeklySchedule> schedules)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = await connection.BeginTransactionAsync();

        try
        {
            const string query = @"
                INSERT INTO pitch_weekly_schedules (pitch_id, day_of_week, open_time, close_time, is_active)
                VALUES (@PitchId, @DayOfWeek, @OpenTime, @CloseTime, @IsActive)
                ON CONFLICT (pitch_id, day_of_week) DO UPDATE
                SET open_time  = EXCLUDED.open_time,
                    close_time = EXCLUDED.close_time,
                    is_active  = EXCLUDED.is_active";

            foreach (var schedule in schedules)
            {
                await connection.ExecuteAsync(query, new
                {
                    PitchId = pitchId,
                    schedule.DayOfWeek,
                    schedule.OpenTime,
                    schedule.CloseTime,
                    schedule.IsActive
                }, transaction);
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int?> GetPitchOwnerIdAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string query = @"
            SELECT owner_id
            FROM pitches
            WHERE id = @PitchId";

        return await connection.QuerySingleOrDefaultAsync<int?>(query, new { PitchId = pitchId });
    }

    /// <inheritdoc />
    public async Task<bool> PitchExistsAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();

        const string query = @"
            SELECT EXISTS(SELECT 1 FROM pitches WHERE id = @PitchId)";

        return await connection.ExecuteScalarAsync<bool>(query, new { PitchId = pitchId });
    }
}

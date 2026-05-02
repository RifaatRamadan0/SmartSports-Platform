using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Pitch;

namespace SmartSports.DAL.Repositories;

public class PitchRepository : IPitchRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PitchRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PitchBookingInfo?> GetByIdAsync(int pitchId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PitchBookingInfo>(
            """
            SELECT id, name, price_per_hour, is_active, is_approved, max_booking_duration_minutes
            FROM pitches
            WHERE id = @PitchId
            """,
            new { PitchId = pitchId });
    }
}

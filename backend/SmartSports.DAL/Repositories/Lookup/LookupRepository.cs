using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Lookup;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Repositories.Lookup;

public class LookupRepository : ILookupRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public LookupRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<CityRow>> ListCitiesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<CityRow>(
            """
            SELECT c.id        AS Id,
                   c.name      AS Name,
                   c.region_id AS RegionId,
                   r.name      AS RegionName
            FROM   cities  c
            JOIN   regions r ON r.id = c.region_id
            ORDER  BY r.name, c.name
            """);
    }

    public async Task<IEnumerable<SportTypeRow>> ListSportTypesAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<SportTypeRow>(
            """
            SELECT id   AS Id,
                   name AS Name
            FROM   sport_types
            ORDER  BY name
            """);
    }
}

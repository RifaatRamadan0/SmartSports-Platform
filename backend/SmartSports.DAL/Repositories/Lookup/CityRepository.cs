using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Lookup;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Repositories.Lookup;

public class CityRepository : ICityRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public CityRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<CityRow>> ListAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<CityRow>(
            """
            SELECT c.id, c.name, r.id AS region_id, r.name AS region_name
            FROM   cities c
            JOIN   regions r ON r.id = c.region_id
            ORDER  BY c.name
            """);
    }
}

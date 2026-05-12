using Dapper;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Lookup;
using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Repositories;

public class CityRepository : ICityRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public CityRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<LookupRow>> ListAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<LookupRow>(
            "SELECT id, name FROM cities ORDER BY name");
    }
}

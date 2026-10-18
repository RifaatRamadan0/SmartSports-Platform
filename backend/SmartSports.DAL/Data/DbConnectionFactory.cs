using Npgsql;
using SmartSports.Domain.Common;
using System.Data.Common;

namespace SmartSports.DAL.Data;

public interface IDbConnectionFactory
{
    DbConnection CreateConnection();
}

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(string connectionString)
    {
        // CURRENT_DATE resolves against the session timezone, a Postgres server
        // setting that is UTC by default on managed hosts. Pinned here, not in a
        // connection string, because appsettings.Development.json is gitignored.
        _connectionString = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Timezone = PitchTime.TimeZoneId
        }.ConnectionString;
    }

    public DbConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }
}
using Npgsql;
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
        _connectionString = connectionString;
    }

    public DbConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }
}
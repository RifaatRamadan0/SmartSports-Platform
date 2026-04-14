using System.Data;
using System.Reflection;
using Dapper;

namespace SmartSports.DAL.Data;

public class MigrationRunner
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly Assembly _assembly = typeof(MigrationRunner).Assembly;

    private const string ScriptPrefix = "SmartSports.DAL.Scripts.";

    public MigrationRunner(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public void Run()
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();

        EnsureMigrationsTable(connection);

        var applied = GetAppliedMigrations(connection);

        foreach (var scriptName in GetScriptNames().Where(n => !applied.Contains(n)))
        {
            var sql = ReadScript(scriptName);

            using var transaction = connection.BeginTransaction();
            try
            {
                connection.Execute(sql, transaction: transaction);
                connection.Execute(
                    "INSERT INTO schema_migrations (name, applied_at) VALUES (@Name, NOW())",
                    new { Name = scriptName },
                    transaction: transaction);
                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }

    private static void EnsureMigrationsTable(IDbConnection connection)
    {
        connection.Execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                name       TEXT        PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """);
    }

    private static HashSet<string> GetAppliedMigrations(IDbConnection connection)
    {
        return connection.Query<string>("SELECT name FROM schema_migrations").ToHashSet();
    }

    private IEnumerable<string> GetScriptNames()
    {
        return _assembly
            .GetManifestResourceNames()
            .Where(n => n.StartsWith(ScriptPrefix) && n.EndsWith(".sql"))
            .OrderBy(n => n);
    }

    private string ReadScript(string resourceName)
    {
        using var stream = _assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource not found: {resourceName}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}

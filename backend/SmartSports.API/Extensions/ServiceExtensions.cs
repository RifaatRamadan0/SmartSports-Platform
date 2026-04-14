using SmartSports.DAL.Data;

namespace SmartSports.API.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddDataAccess(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured.");

        services.AddSingleton<IDbConnectionFactory>(_ =>
            new DbConnectionFactory(connectionString));

        services.AddSingleton<MigrationRunner>();

        return services;
    }
}

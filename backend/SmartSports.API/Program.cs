using SmartSports.API.Extensions;
using SmartSports.API.Middleware;
using SmartSports.DAL.Data;

namespace SmartSports.API;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // ── Services ────────────────────────────────────────────
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();

        // Fail fast if the JWT signing key is not a base64-encoded value of at least
        // 32 raw bytes (256 bits — the HS256 minimum). Runs before AddJwtAuthentication
        // so we never wire the auth pipeline against an invalid key.
        // Generate one with:  openssl rand -base64 48
        var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
        byte[] decodedSecret;
        try
        {
            decodedSecret = Convert.FromBase64String(jwtSecret);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "Jwt:Secret must be a base64-encoded value (not a passphrase). " +
                "Generate one with:  openssl rand -base64 48");
        }
        if (decodedSecret.Length < 32)
            throw new InvalidOperationException(
                $"Jwt:Secret decodes to {decodedSecret.Length} bytes; minimum is 32 bytes (256 bits) for HS256. " +
                "Generate one with:  openssl rand -base64 48");

        builder.Services.AddResponseCaching();
        builder.Services.AddSwaggerConfiguration();
        builder.Services.AddCorsConfiguration(builder.Configuration);
        builder.Services.AddJwtAuthentication(builder.Configuration);
        builder.Services.AddRoleBasedAuthorization();
        builder.Services.AddAuthRateLimiting();
        builder.Services.AddForwardedHeadersConfiguration(builder.Configuration);
        builder.Services.AddApplicationServices(builder.Configuration);
        builder.Services.AddDataAccess(builder.Configuration);

        // ── Build ────────────────────────────────────────────────
        var app = builder.Build();

        // Tell Dapper to map snake_case column names to PascalCase properties
        // e.g. password_hash → PasswordHash, created_at → CreatedAt
        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

        // Dapper doesn't natively bind .NET 6 DateOnly/TimeOnly as parameters
        Dapper.SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        Dapper.SqlMapper.AddTypeHandler(new TimeOnlyTypeHandler());

        app.Services.GetRequiredService<MigrationRunner>().Run();

        // ── Middleware Pipeline ──────────────────────────────────

        // Must run before rate limiting so RemoteIpAddress is set from
        // X-Forwarded-For when the app is behind a reverse proxy/load balancer.
        app.UseForwardedHeaders();

        app.UseMiddleware<ExceptionHandlingMiddleware>();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartSports API v1");
            });
        }

        app.UseHttpsRedirection();

        app.UseCors("SmartSportsCorsPolicy");

        app.UseResponseCaching();

        app.UseRateLimiter();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
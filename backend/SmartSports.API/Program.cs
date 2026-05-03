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

        builder.Services.AddSwaggerConfiguration();
        builder.Services.AddCorsConfiguration(builder.Configuration);
        builder.Services.AddJwtAuthentication(builder.Configuration);
        builder.Services.AddRoleBasedAuthorization();
        builder.Services.AddAuthRateLimiting();
        builder.Services.AddApplicationServices();
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

        app.UseRateLimiter();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
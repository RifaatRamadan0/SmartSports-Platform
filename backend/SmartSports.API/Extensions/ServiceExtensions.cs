using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartSports.API.BackgroundServices;
using Resend;
using SmartSports.BLL.Interfaces;
using SmartSports.BLL.Services;
using SmartSports.DAL.Data;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Availability;
using SmartSports.DAL.Interfaces.Booking;
using SmartSports.DAL.Interfaces.Lookup;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Repositories;

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

    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "SmartSports API",
                Version = "v1",
                Description = "Smart Sports Pitch Discovery, Booking & Team Coordination Platform"
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter your JWT token. Example: Bearer {token}"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    public static IServiceCollection AddCorsConfiguration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var configuredOrigins = configuration["Cors:AllowedOrigins"];
        var allowedOrigins = string.IsNullOrWhiteSpace(configuredOrigins)
            ? new[] { "http://localhost:5173" }
            : configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        services.AddCors(options =>
        {
            options.AddPolicy("SmartSportsCorsPolicy", policy =>
            {
                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"];
        var issuer = configuration["Jwt:Issuer"];
        var audience = configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("JWT Secret is not configured.");

        var key = Encoding.UTF8.GetBytes(secret);

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ClockSkew = TimeSpan.Zero
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }

    public static IServiceCollection AddRoleBasedAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy("PlayerOnly",         p => p.RequireRole("Player"));
            options.AddPolicy("PitchOwnerOnly",     p => p.RequireRole("PitchOwner"));
            options.AddPolicy("AdminOnly",          p => p.RequireRole("Admin"));
            options.AddPolicy("PlayerOrPitchOwner", p => p.RequireRole("Player", "PitchOwner"));
        });
        return services;
    }

    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Resend email client — use typed client on the interface so the managed HttpClient pipeline applies.
        services.AddOptions();
        services.Configure<ResendClientOptions>(options =>
        {
            options.ApiToken = configuration["Resend:ApiKey"]
                ?? throw new InvalidOperationException("Resend:ApiKey is not configured.");
        });
        services.AddHttpClient<IResend, ResendClient>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
        services.AddScoped<IEmailService, ResendEmailService>();
        services.AddSingleton<ITwilioService, TwilioVerifyService>();
        services.AddScoped<IPhoneProofService, PhoneProofService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddHostedService<ExpiredTokenCleanupService>();

        // Schedule
        services.AddScoped<IPitchScheduleRepository, PitchScheduleRepository>();
        services.AddScoped<IPitchScheduleService, PitchScheduleService>();

        // Availability
        services.AddScoped<IAvailabilityRepository, AvailabilityRepository>();
        services.AddScoped<IAvailabilityService, AvailabilityService>();

        // Booking
        services.AddScoped<IPitchRepository, PitchRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();

        // Pitch
        services.AddScoped<IPitchService, PitchService>();

        // Lookups (sport types, cities)
        services.AddScoped<ISportTypeRepository, SportTypeRepository>();
        services.AddScoped<ICityRepository, CityRepository>();
        services.AddScoped<ISportTypeService, SportTypeService>();
        services.AddScoped<ICityService, CityService>();

        return services;
    }

    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            static string IpPartition(HttpContext ctx) =>
                ctx.Connection.RemoteIpAddress is not null
                    ? $"ip:{ctx.Connection.RemoteIpAddress}"
                    : $"connection:{ctx.Connection.Id}";

            options.AddPolicy("auth", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: IpPartition(httpContext),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy("availability", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: IpPartition(httpContext),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 30,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }

    // Configures forwarded-header trust so X-Forwarded-For from a known proxy
    // populates RemoteIpAddress before the rate limiter runs. Without trusted
    // entries, ASP.NET only honors forwarders from localhost — meaning a real
    // proxy (nginx, ALB, Cloudflare) is silently ignored and every request
    // shares the proxy's IP in the rate-limit bucket.
    public static IServiceCollection AddForwardedHeadersConfiguration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 2;

            var section = configuration.GetSection("ForwardedHeaders");
            var knownNetworks = section.GetSection("KnownNetworks").Get<string[]>() ?? Array.Empty<string>();
            var knownProxies  = section.GetSection("KnownProxies").Get<string[]>()  ?? Array.Empty<string>();

            foreach (var cidr in knownNetworks)
            {
                var parts = cidr.Split('/');
                options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(
                    IPAddress.Parse(parts[0]),
                    int.Parse(parts[1])));
            }

            foreach (var ip in knownProxies)
                options.KnownProxies.Add(IPAddress.Parse(ip));
        });

        return services;
    }
}
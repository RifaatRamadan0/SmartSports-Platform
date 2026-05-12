using Microsoft.Extensions.Logging;
using SmartSports.DAL.Interfaces.Auth;

namespace SmartSports.API.BackgroundServices;

public class ExpiredTokenCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredTokenCleanupService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public ExpiredTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<ExpiredTokenCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();

                var refreshRepo = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
                await refreshRepo.DeleteExpiredAsync();

                var resetRepo = scope.ServiceProvider.GetRequiredService<IPasswordResetTokenRepository>();
                await resetRepo.DeleteExpiredAsync();

                var verifyRepo = scope.ServiceProvider.GetRequiredService<IEmailVerificationTokenRepository>();
                await verifyRepo.DeleteExpiredAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete expired tokens.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }
}

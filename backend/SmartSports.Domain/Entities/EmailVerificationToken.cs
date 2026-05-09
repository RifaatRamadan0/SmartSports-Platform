namespace SmartSports.Domain.Entities;

public class EmailVerificationToken
{
    public Guid Id { get; set; }
    public int UserId { get; set; }
    public Guid Token { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAt;
    public bool IsUsed => UsedAt.HasValue;
    public bool IsValid => !IsExpired && !IsUsed;
}

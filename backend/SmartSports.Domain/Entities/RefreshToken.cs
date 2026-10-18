namespace SmartSports.Domain.Entities;

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }

    // Returns true if the token is expired OR has been revoked
    public bool IsValid => !IsRevoked && DateTime.UtcNow < ExpiresAt;
}

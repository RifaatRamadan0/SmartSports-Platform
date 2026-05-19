namespace SmartSports.Domain.Common;

/// <summary>
/// String constants that mirror the notification_type PostgreSQL enum
/// (defined in migration 001). Use these instead of raw string literals so
/// any mismatch with the DB enum is caught at compile time rather than at
/// runtime when the cast fails.
/// </summary>
public static class NotificationTypes
{
    public const string BookingConfirmed = "booking_confirmed";
    public const string BookingCancelled = "booking_cancelled";
    public const string MatchInvitation  = "match_invitation";
    public const string MatchJoined      = "match_joined";
    public const string MatchCancelled   = "match_cancelled";
    public const string ReviewReceived   = "review_received";
}

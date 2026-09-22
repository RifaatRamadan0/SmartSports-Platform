namespace SmartSports.Domain.Common;

/// <summary>
/// The timezone the business operates in. Booking and schedule times are stored
/// as wall-clock values with no zone, so the zone must be supplied wherever one
/// is compared against "now". Lives in Domain so DAL and BLL share one definition.
/// Use the IANA id, never a fixed offset: Lebanon is +02:00 in winter, +03:00 in summer.
/// </summary>
public static class PitchTime
{
    public const string TimeZoneId = "Asia/Beirut";
}

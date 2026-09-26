namespace SmartSports.Domain.Common;

/// <summary>
/// Booking and schedule times are stored as wall-clock values with no zone, so the
/// zone has to be supplied wherever one is compared against "now". IANA id, not a
/// fixed offset: Lebanon is +02:00 in winter and +03:00 in summer.
/// </summary>
public static class PitchTime
{
    public const string TimeZoneId = "Asia/Beirut";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    public static DateTime Now   => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone);
    public static DateOnly Today => DateOnly.FromDateTime(Now);

    // Compare the result against UtcNow, so adding hours is real elapsed time.
    public static DateTime ToUtc(DateOnly date, TimeOnly time)
    {
        var local = date.ToDateTime(time);

        // A wall-clock time inside the spring-forward gap never happens. Shift it forward
        // by the DST delta, matching the frontend, rather than throwing a 400 at the user.
        if (Zone.IsInvalidTime(local))
            local = local.Add(DaylightDeltaAt(local));

        return TimeZoneInfo.ConvertTimeToUtc(local, Zone);
    }

    private static TimeSpan DaylightDeltaAt(DateTime local) =>
        Zone.GetAdjustmentRules().FirstOrDefault(r => local >= r.DateStart && local <= r.DateEnd)
            ?.DaylightDelta ?? TimeSpan.FromHours(1);
}

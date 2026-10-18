namespace SmartSports.Domain.Entities;

public class Review
{
    public int       Id        { get; init; }
    public int       UserId    { get; init; }
    public int       PitchId   { get; init; }
    public int       BookingId { get; init; }
    public short     Rating    { get; init; }
    public string?   Comment   { get; init; }
    public DateTime  CreatedAt { get; init; }
}

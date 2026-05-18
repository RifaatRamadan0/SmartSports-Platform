namespace SmartSports.Domain.Entities;

public class Match
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public bool IsOpenToJoin { get; set; }
    public int MaxPlayers { get; set; }
}

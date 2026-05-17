namespace SmartSports.BLL.DTOs.Match;

public class MatchResponse
{
    public int  Id           { get; set; }
    public int  BookingId    { get; set; }
    public bool IsOpenToJoin { get; set; }
    public int  MaxPlayers   { get; set; }
}

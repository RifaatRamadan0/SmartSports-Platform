namespace SmartSports.BLL.DTOs.Match;

// Same shape as MatchSummaryResponse with two extra fields telling the caller
// what role they have in the match. Used by GET /api/matches/my so the UI can
// show one merged "My Games" section without making N+1 status calls.
public class MyMatchSummaryResponse : MatchSummaryResponse
{
    // "organizer" when the caller created the booking, "participant" otherwise.
    public string MyRole { get; set; } = string.Empty;

    // "accepted" or "pending" when MyRole == "participant"; null when organizer.
    public string? MyStatus { get; set; }
}

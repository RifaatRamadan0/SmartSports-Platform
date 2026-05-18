namespace SmartSports.BLL.DTOs.Match;

public record MatchParticipantResponse(int Id, int MatchId, int UserId, string Status);

using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Match;

public record RespondToParticipantRequest([Required] string Action); // "accept" or "reject"

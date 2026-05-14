namespace SmartSports.BLL.DTOs.Pitch;

public class ReviewSummary
{
    public int      Id           { get; init; }
    public string   ReviewerName { get; init; } = string.Empty;
    public int      Rating       { get; init; }
    public string?  Comment      { get; init; }
    public DateTime CreatedAt    { get; init; }
}

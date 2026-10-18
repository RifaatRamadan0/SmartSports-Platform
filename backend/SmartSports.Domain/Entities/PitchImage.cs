namespace SmartSports.Domain.Entities;

public class PitchImage
{
    public int      Id           { get; init; }
    public int      PitchId      { get; init; }
    public string   ImageUrl     { get; init; } = string.Empty;
    public bool     IsCover      { get; init; }
    public int      DisplayOrder { get; init; }
    public DateTime CreatedAt    { get; init; }
}

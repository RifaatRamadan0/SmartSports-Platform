namespace SmartSports.BLL.DTOs.Pitch;

public class PitchImageResponse
{
    public int    Id           { get; set; }
    public string ImageUrl     { get; set; } = string.Empty;
    public bool   IsCover      { get; set; }
    public int    DisplayOrder { get; set; }
}

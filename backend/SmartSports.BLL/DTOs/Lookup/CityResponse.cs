namespace SmartSports.BLL.DTOs.Lookup;

public class CityResponse
{
    public int    Id         { get; set; }
    public string Name       { get; set; } = string.Empty;
    public int    RegionId   { get; set; }
    public string RegionName { get; set; } = string.Empty;
}

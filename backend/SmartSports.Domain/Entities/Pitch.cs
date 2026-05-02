namespace SmartSports.Domain.Entities;

public class Pitch
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public int CityId { get; set; }
    public int SportTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal PricePerHour { get; set; }
    public decimal? Rating { get; set; }        // nullable — computed/updated by app layer
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsActive { get; set; }
    public bool IsApproved { get; set; }
    public int MaxBookingDurationMinutes { get; set; }
    public DateTime CreatedAt { get; set; }
}
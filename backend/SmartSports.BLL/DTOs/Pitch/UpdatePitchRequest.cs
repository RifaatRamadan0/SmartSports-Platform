using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Pitch;

public class UpdatePitchRequest
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "CityId must be a valid city.")]
    public int CityId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "SportTypeId must be a valid sport type.")]
    public int SportTypeId { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(255, MinimumLength = 2)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [Range(0.01, 100000.00, ErrorMessage = "PricePerHour must be greater than 0.")]
    public decimal PricePerHour { get; set; }

    [Range(-90.0, 90.0)]
    public decimal? Latitude { get; set; }

    [Range(-180.0, 180.0)]
    public decimal? Longitude { get; set; }

    [Required]
    [Range(60, 480, ErrorMessage = "MaxBookingDurationMinutes must be between 60 and 480.")]
    public int MaxBookingDurationMinutes { get; set; }

    [Required]
    [Range(2, 30, ErrorMessage = "Capacity must be between 2 and 30 players.")]
    public int Capacity { get; set; }

    [Required]
    public bool IsActive { get; set; }
}

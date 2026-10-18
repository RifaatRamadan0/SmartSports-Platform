using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Pitch;

public class AddPitchImageRequest
{
    [Required]
    [Url]
    [StringLength(2048, MinimumLength = 1)]
    public string ImageUrl { get; set; } = string.Empty;

    public bool? IsCover { get; set; }
}

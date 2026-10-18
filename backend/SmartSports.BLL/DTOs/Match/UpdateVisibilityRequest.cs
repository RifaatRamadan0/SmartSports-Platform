using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Match;

public class UpdateVisibilityRequest
{
    [Required(ErrorMessage = "IsOpenToJoin is required.")]
    public bool? IsOpenToJoin { get; set; }
}

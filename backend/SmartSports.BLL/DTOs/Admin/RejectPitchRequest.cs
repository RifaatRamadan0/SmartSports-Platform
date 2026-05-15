using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Admin;

public class RejectPitchRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}

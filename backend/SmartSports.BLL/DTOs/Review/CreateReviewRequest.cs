using System.ComponentModel.DataAnnotations;

namespace SmartSports.BLL.DTOs.Review;

public class CreateReviewRequest
{
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public short Rating { get; set; }

    [MaxLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters.")]
    public string? Comment { get; set; }
}

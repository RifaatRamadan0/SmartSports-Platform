using SmartSports.BLL.DTOs.Pitch;

namespace SmartSports.BLL.Interfaces.Pitch;

public interface IPitchImageService
{
    Task<IEnumerable<PitchImageResponse>> ListAsync(int ownerId, int pitchId);
    Task<PitchImageResponse>              AddAsync(int ownerId, int pitchId, AddPitchImageRequest request);
    Task<PitchImageResponse>              SetCoverAsync(int ownerId, int pitchId, int imageId);
    Task                                  DeleteAsync(int ownerId, int pitchId, int imageId);
}

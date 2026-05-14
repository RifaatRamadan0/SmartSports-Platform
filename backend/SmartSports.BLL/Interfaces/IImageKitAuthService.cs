using SmartSports.BLL.DTOs.Upload;

namespace SmartSports.BLL.Interfaces;

public interface IImageKitAuthService
{
    /// <summary>
    /// Returns a one-shot token + expiry + HMAC-SHA1 signature the browser
    /// includes when POSTing a file to https://upload.imagekit.io/api/v1/files/upload.
    /// </summary>
    ImageKitAuthResponse GenerateAuthParams();
}

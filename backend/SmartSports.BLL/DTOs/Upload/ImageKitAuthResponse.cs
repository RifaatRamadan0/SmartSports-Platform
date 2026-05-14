namespace SmartSports.BLL.DTOs.Upload;

/// <summary>
/// Short-lived signed credentials handed to the browser so it can POST a file
/// directly to ImageKit. The private key never leaves the server.
/// </summary>
public class ImageKitAuthResponse
{
    public string Token     { get; set; } = string.Empty;
    public long   Expire    { get; set; }
    public string Signature { get; set; } = string.Empty;
}

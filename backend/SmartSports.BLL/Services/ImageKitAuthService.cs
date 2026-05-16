using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using SmartSports.BLL.DTOs.Upload;
using SmartSports.BLL.Interfaces;

namespace SmartSports.BLL.Services;

public class ImageKitAuthService : IImageKitAuthService
{
    // ImageKit allows up to 1 hour; keep it short so a leaked signature has limited reach.
    private const int TokenLifetimeSeconds = 600;

    private readonly string _privateKey;

    public ImageKitAuthService(IConfiguration configuration)
    {
        _privateKey = configuration["ImageKit:PrivateKey"]
            ?? throw new InvalidOperationException("ImageKit:PrivateKey is not configured.");
    }

    public ImageKitAuthResponse GenerateAuthParams()
    {
        var token  = Guid.NewGuid().ToString("N");
        var expire = DateTimeOffset.UtcNow.AddSeconds(TokenLifetimeSeconds).ToUnixTimeSeconds();

        // Per ImageKit docs: HMAC-SHA1(token + expire) using the private key as the secret,
        // emitted as a lowercase hex string.
        using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(_privateKey));
        var bytes     = hmac.ComputeHash(Encoding.UTF8.GetBytes(token + expire));
        var signature = Convert.ToHexString(bytes).ToLowerInvariant();

        return new ImageKitAuthResponse
        {
            Token     = token,
            Expire    = expire,
            Signature = signature,
        };
    }
}

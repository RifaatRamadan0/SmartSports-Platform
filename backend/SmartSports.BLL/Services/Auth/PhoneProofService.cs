using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartSports.BLL.Interfaces.Auth;

namespace SmartSports.BLL.Services.Auth;

public class PhoneProofService : IPhoneProofService
{
    private const int TtlMinutes = 10;
    private const string PhoneClaim = "phone_verified";

    private readonly SymmetricSecurityKey _key;

    public PhoneProofService(IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public string GenerateProof(string phoneNumber)
    {
        var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims:  [new Claim(PhoneClaim, phoneNumber)],
            expires: DateTime.UtcNow.AddMinutes(TtlMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public bool ValidateProof(string token, string phoneNumber)
    {
        var handler = new JwtSecurityTokenHandler();

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer           = false,
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = _key,
            ClockSkew                = TimeSpan.Zero
        };

        try
        {
            var principal = handler.ValidateToken(token, parameters, out _);
            var claim = principal.FindFirst(PhoneClaim)?.Value;
            return string.Equals(claim, phoneNumber, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }
}

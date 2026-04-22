using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Entities;

namespace SmartSports.BLL.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IRefreshTokenRepository _refreshTokenRepository;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Player", "PitchOwner"
    };

    public AuthService(IUserRepository userRepository, IConfiguration configuration, IRefreshTokenRepository refreshTokenRepository)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _refreshTokenRepository = refreshTokenRepository;
    }

    // -- Registration --

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (!AllowedRoles.Contains(request.Role))
            throw new ArgumentException("Role must be 'Player' or 'PitchOwner'.");

        if (await _userRepository.ExistsByEmailAsync(request.Email))
            throw new ArgumentException("Email is already in use.");

        if (await _userRepository.ExistsByUsernameAsync(request.Username))
            throw new ArgumentException("Username is already taken.");

        var role = await _userRepository.GetRoleByNameAsync(request.Role)
            ?? throw new InvalidOperationException($"Role '{request.Role}' not found in database.");

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        var userId = await _userRepository.CreateWithRoleAsync(user, role.Id);

        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);
        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = userId,
            Token = refreshTokenValue,
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        var roles = new[] { request.Role };
        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(userId, request.Username, request.Email, roles, expiryMinutes),
            RefreshToken = refreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            ExpiresIn = expiryMinutes * 60,
            Roles = roles
        };
    }

    // -- Login --

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.EmailOrUsername)
            ?? await _userRepository.GetByUsernameAsync(request.EmailOrUsername);

        if (user == null)
            return null;

        if(!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;
    
        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            throw new InvalidOperationException($"User {user.Id} has no roles assigned.");

        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(user.Id, user.Username, user.Email, userRoles, expiryMinutes),
            ExpiresIn = expiryMinutes * 60,
            RefreshToken = refreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            Roles = userRoles
        };
    }

    // -- Refresh Token --

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken);

        if(storedToken is null || !storedToken.IsValid)
            return null;

        var user = await _userRepository.GetByIdAsync(storedToken.UserId);

        if (user == null)
            return null;

        await _refreshTokenRepository.RevokeAsync(refreshToken);

        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var newRefreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshTokenValue,
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            throw new InvalidOperationException($"User {user.Id} has no roles assigned.");

        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(user.Id, user.Username, user.Email, userRoles, expiryMinutes),
            ExpiresIn = expiryMinutes * 60,
            RefreshToken = newRefreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            Roles = userRoles
        };
    }

    // -- Private Helpers --

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private int GetAccessTokenExpiryMinutes()
    {
        return int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var parsed) ? parsed : 15;
    }

    private int GetRefreshTokenExpiryDays()
    {
        return int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var parsed) ? parsed : 7;
    }

    private string GenerateJwtToken(int userId, string username, string email, IEnumerable<string> roles, int expiryMinutes)
    {
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

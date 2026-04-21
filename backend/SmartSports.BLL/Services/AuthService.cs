using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartSports.BLL.DTOs;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces;
using SmartSports.Domain.Entities;

namespace SmartSports.BLL.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Player", "PitchOwner"
    };

    public AuthService(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

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

        var expiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var parsed) ? parsed : 15;

        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(userId, request.Username, request.Email, request.Role, expiryMinutes),
            ExpiresIn = expiryMinutes * 60
        };
    }

    private string GenerateJwtToken(int userId, string username, string email, string role, int expiryMinutes)
    {
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

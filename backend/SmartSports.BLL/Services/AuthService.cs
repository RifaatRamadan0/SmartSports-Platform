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
    private readonly IPasswordResetTokenRepository _passwordResetTokenRepository;
    private readonly IEmailService _emailService;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Player", "PitchOwner"
    };

    // Pre-computed valid BCrypt hash used to blind timing when the user does not exist.
    // Generated at startup so the hash parser never fails on a malformed literal.
    private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        IRefreshTokenRepository refreshTokenRepository,
        IPasswordResetTokenRepository passwordResetTokenRepository,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _refreshTokenRepository = refreshTokenRepository;
        _passwordResetTokenRepository = passwordResetTokenRepository;
        _emailService = emailService;
    }

    // -- Registration --

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (!AllowedRoles.Contains(request.Role))
            throw new ArgumentException("Role must be 'Player' or 'PitchOwner'.");

        var email = request.Email.Trim();
        var username = request.Username.Trim();

        if (await _userRepository.ExistsByEmailAsync(email))
            throw new ArgumentException("Email is already in use.");

        if (await _userRepository.ExistsByUsernameAsync(username))
            throw new ArgumentException("Username is already taken.");

        var role = await _userRepository.GetRoleByNameAsync(request.Role)
            ?? throw new InvalidOperationException($"Role '{request.Role}' not found in database.");

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            SkillLevel = (short?)request.SkillLevel,
            PreferredPosition = string.IsNullOrWhiteSpace(request.PreferredPosition) ? null : request.PreferredPosition.Trim(),
            PhoneNumber = request.PhoneNumber.Trim()
        };

        var userId = await _userRepository.CreateWithRoleAsync(user, role.Id);

        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);
        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = userId,
            Token = HashToken(refreshTokenValue),
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        var roles = new[] { request.Role };
        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(userId, username, email, roles, expiryMinutes),
            RefreshToken = refreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            ExpiresIn = expiryMinutes * 60,
            Roles = roles
        };
    }

    private static readonly System.Text.RegularExpressions.Regex EmailRegex =
        new(@"^\S+@\S+\.\S+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public async Task<AvailabilityResponse> CheckAvailabilityAsync(string? username, string? email, string? phoneNumber)
    {
        var response = new AvailabilityResponse();

        if (!string.IsNullOrWhiteSpace(username) && username.Length is >= 3 and <= 50)
            response.UsernameAvailable = !await _userRepository.ExistsByUsernameAsync(username);

        if (!string.IsNullOrWhiteSpace(email) && email.Length <= 254 && EmailRegex.IsMatch(email))
            response.EmailAvailable = !await _userRepository.ExistsByEmailAsync(email);

        if (!string.IsNullOrWhiteSpace(phoneNumber))
            response.PhoneNumberAvailable = !await _userRepository.ExistsByPhoneNumberAsync(phoneNumber.Trim());

        return response;
    }

    // -- Login --

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.EmailOrUsername)
            ?? await _userRepository.GetByUsernameAsync(request.EmailOrUsername);

        // Always run BCrypt regardless of whether the user exists to prevent
        // timing-based username/email enumeration attacks.
        var hashToVerify = user?.PasswordHash ?? DummyPasswordHash;
        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, hashToVerify);

        if (user == null || !passwordValid)
            return null;

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            return null;

        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = HashToken(refreshTokenValue),
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

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
        var hashedIncoming = HashToken(refreshToken);
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(hashedIncoming);

        if(storedToken is null || !storedToken.IsValid)
            return null;

        var user = await _userRepository.GetByIdAsync(storedToken.UserId);

        if (user == null)
            return null;

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            return null;

        // Atomic revoke: only proceeds if this token hasn't already been revoked
        // by a concurrent request. Prevents double-rotation on replay.
        var revoked = await _refreshTokenRepository.RevokeAsync(hashedIncoming);
        if (revoked == 0)
            return null;

        var expiryMinutes = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var newRefreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = HashToken(newRefreshTokenValue),
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        return new AuthResponse
        {
            AccessToken = GenerateJwtToken(user.Id, user.Username, user.Email, userRoles, expiryMinutes),
            ExpiresIn = expiryMinutes * 60,
            RefreshToken = newRefreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            Roles = userRoles
        };
    }

    // -- Logout --
    public async Task LogoutAsync(string refreshToken)
    {
        await _refreshTokenRepository.RevokeAsync(HashToken(refreshToken));
    }


    // Forgot Password 
    public async Task ForgotPasswordAsync(ForgotPasswordRequest dto, string baseUrl)
    {
        // Look up user — but NEVER reveal whether email exists
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user is null) return; // silent return — no user enumeration

        var resetToken = await _passwordResetTokenRepository.CreateAsync(user.Id);

        var resetLink = $"{baseUrl}/reset-password?token={resetToken.Token}";

        await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);
    }

    // Reset Password
    public async Task ResetPasswordAsync(ResetPasswordRequest dto)
    {
        var resetToken = await _passwordResetTokenRepository.GetByTokenAsync(dto.Token);

        if (resetToken is null || !resetToken.IsValid)
            throw new ArgumentException("Token is invalid or has expired.");

        var user = await _userRepository.GetByIdAsync(resetToken.UserId)
            ?? throw new InvalidOperationException("User not found.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepository.UpdatePasswordAsync(user.Id, newHash);
        await _passwordResetTokenRepository.MarkUsedAsync(dto.Token);
    }

    // -- Private Helpers --

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    // SHA-256 is sufficient here: refresh tokens are 64 bytes of CSPRNG output,
    // so they're not brute-forceable and don't need a slow KDF.
    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
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

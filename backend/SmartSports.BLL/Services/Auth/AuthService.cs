using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartSports.BLL.DTOs.Auth;
using SmartSports.BLL.DTOs.Availability;
using SmartSports.BLL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.Domain.Exceptions;

namespace SmartSports.BLL.Services.Auth;
// Imported inside the namespace so entity types (e.g. User) resolve before the
// sibling SmartSports.BLL.Services.* namespaces that share their names.
using SmartSports.Domain.Entities;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IPasswordResetTokenRepository _passwordResetTokenRepository;
    private readonly IEmailVerificationTokenRepository _emailVerificationTokenRepository;
    private readonly IEmailService _emailService;
    private readonly ITwilioService _twilioService;
    private readonly IPhoneProofService _phoneProofService;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Player", "PitchOwner"
    };

    private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        IRefreshTokenRepository refreshTokenRepository,
        IPasswordResetTokenRepository passwordResetTokenRepository,
        IEmailVerificationTokenRepository emailVerificationTokenRepository,
        IEmailService emailService,
        ITwilioService twilioService,
        IPhoneProofService phoneProofService)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _refreshTokenRepository = refreshTokenRepository;
        _passwordResetTokenRepository = passwordResetTokenRepository;
        _emailVerificationTokenRepository = emailVerificationTokenRepository;
        _emailService = emailService;
        _twilioService = twilioService;
        _phoneProofService = phoneProofService;
    }

    // -- Registration --

    public async Task RegisterAsync(RegisterRequest request, string baseUrl)
    {
        if (!AllowedRoles.Contains(request.Role))
            throw new ArgumentException("Role must be 'Player' or 'PitchOwner'.");

        var email       = request.Email.Trim();
        var username    = request.Username.Trim();
        var phoneNumber = NormalizePhone(request.PhoneNumber);

        if (!_phoneProofService.ValidateProof(request.PhoneVerificationProof, phoneNumber))
            throw new ArgumentException("Phone verification has expired or is invalid. Please verify your phone number again.");

        if (await _userRepository.ExistsByEmailAsync(email))
            throw new ArgumentException("Email is already in use.");

        if (await _userRepository.ExistsByUsernameAsync(username))
            throw new ArgumentException("Username is already taken.");

        var role = await _userRepository.GetRoleByNameAsync(request.Role)
            ?? throw new InvalidOperationException($"Role '{request.Role}' not found in database.");

        var user = new User
        {
            Username          = username,
            Email             = email,
            PasswordHash      = BCrypt.Net.BCrypt.HashPassword(request.Password),
            SkillLevel        = (short?)request.SkillLevel,
            PreferredPosition = string.IsNullOrWhiteSpace(request.PreferredPosition) ? null : request.PreferredPosition.Trim(),
            PhoneNumber       = phoneNumber,
            IsPhoneVerified   = true
        };

        var userId = await _userRepository.CreateWithRoleAsync(user, role.Id);

        var verificationToken = await _emailVerificationTokenRepository.CreateAsync(userId);
        var verificationLink  = $"{baseUrl}/confirm-email?token={verificationToken.Token}";

        // Fire-and-forget: user is already created; email failure is recoverable via resend-verification.
        _ = _emailService.SendVerificationEmailAsync(email, verificationLink)
            .ContinueWith(_ => { }, TaskContinuationOptions.OnlyOnFaulted);
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

        if (!string.IsNullOrWhiteSpace(phoneNumber) && phoneNumber.Length <= 32)
            response.PhoneNumberAvailable = !await _userRepository.ExistsByPhoneNumberAsync(NormalizePhone(phoneNumber));

        return response;
    }

    // -- Login --

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.EmailOrUsername)
            ?? await _userRepository.GetByUsernameAsync(request.EmailOrUsername);

        var hashToVerify = user?.PasswordHash ?? DummyPasswordHash;
        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, hashToVerify);

        if (user == null || !passwordValid)
            return null;

        if (!user.IsEmailVerified)
            throw new ForbiddenException("Your email address has not been verified. Please check your inbox.");

        if (user.IsBanned)
            throw new UnauthorizedAccessException("Your account has been banned.");

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            return null;

        return await IssueSessionAsync(user, userRoles);
    }

    // -- Refresh Token --

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var hashedIncoming = HashToken(refreshToken);
        var storedToken    = await _refreshTokenRepository.GetByTokenAsync(hashedIncoming);

        if (storedToken is null || !storedToken.IsValid)
            return null;

        var user = await _userRepository.GetByIdAsync(storedToken.UserId);
        if (user == null || user.IsBanned)
            return null;

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            return null;

        var revoked = await _refreshTokenRepository.RevokeAsync(hashedIncoming);
        if (revoked == 0)
            return null;

        return await IssueSessionAsync(user, userRoles);
    }

    // -- Session issuance --

    /// <summary>
    /// Mints a fresh refresh token + access token for an already-authenticated user
    /// and returns the new session. Used after a password change, where every existing
    /// refresh token has just been revoked but the caller's current device should stay
    /// signed in. Returns null if the user no longer exists, is banned, or has no roles.
    /// </summary>
    public async Task<AuthResponse?> IssueSessionForUserAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || user.IsBanned)
            return null;

        var userRoles = (await _userRepository.GetUserRolesAsync(user.Id)).ToList();
        if (userRoles.Count == 0)
            return null;

        return await IssueSessionAsync(user, userRoles);
    }

    private async Task<AuthResponse> IssueSessionAsync(User user, List<string> userRoles)
    {
        var expiryMinutes          = GetAccessTokenExpiryMinutes();
        var refreshTokenExpiryDays = GetRefreshTokenExpiryDays();

        var refreshTokenValue     = GenerateRefreshToken();
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        await _refreshTokenRepository.CreateAsync(new RefreshToken
        {
            UserId    = user.Id,
            Token     = HashToken(refreshTokenValue),
            ExpiresAt = refreshTokenExpiresAt,
            IsRevoked = false
        });

        return new AuthResponse
        {
            AccessToken           = GenerateJwtToken(user.Id, user.Username, user.Email, userRoles, expiryMinutes),
            ExpiresIn             = expiryMinutes * 60,
            RefreshToken          = refreshTokenValue,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            Roles                 = userRoles
        };
    }

    // -- Logout --

    public async Task LogoutAsync(string refreshToken)
    {
        await _refreshTokenRepository.RevokeAsync(HashToken(refreshToken));
    }

    // -- Phone Verification --

    public async Task SendPhoneOtpAsync(string phoneNumber)
    {
        await _twilioService.SendOtpAsync(NormalizePhone(phoneNumber));
    }

    public async Task<string> VerifyPhoneOtpAsync(string phoneNumber, string code)
    {
        var normalized = NormalizePhone(phoneNumber);
        var verified = await _twilioService.VerifyOtpAsync(normalized, code);

        if (!verified)
            throw new ArgumentException("The code is incorrect or has expired.");

        return _phoneProofService.GenerateProof(normalized);
    }

    // -- Email Verification --

    public async Task VerifyEmailAsync(Guid token)
    {
        var record = await _emailVerificationTokenRepository.GetByTokenAsync(token);

        if (record is null)
            throw new ArgumentException("Verification link is invalid or has expired.");

        // Idempotent: handle double-fire (StrictMode, email link scanners)
        if (record.IsUsed)
        {
            var user = await _userRepository.GetByIdAsync(record.UserId);
            if (user?.IsEmailVerified == true) return;
            throw new ArgumentException("Verification link has already been used.");
        }

        if (record.IsExpired)
            throw new ArgumentException("Verification link has expired.");

        await _userRepository.VerifyEmailAsync(record.UserId);
        await _emailVerificationTokenRepository.MarkUsedAsync(token);
    }

    public async Task ResendVerificationEmailAsync(string email, string baseUrl)
    {
        var user = await _userRepository.GetByEmailAsync(email.Trim());

        // Constant-time mitigation: equalize the cheap pre-email work so an attacker can't
        // distinguish an unknown/already-verified account from an unverified one by latency.
        if (user is null || user.IsEmailVerified)
        {
            BCrypt.Net.BCrypt.Verify(Guid.NewGuid().ToString(), DummyPasswordHash);
            return;
        }

        var verificationToken = await _emailVerificationTokenRepository.CreateAsync(user.Id);
        var verificationLink  = $"{baseUrl}/confirm-email?token={verificationToken.Token}";

        // Fire-and-forget so response time doesn't leak account existence via email-provider latency.
        _ = _emailService.SendVerificationEmailAsync(user.Email, verificationLink)
            .ContinueWith(_ => { }, TaskContinuationOptions.OnlyOnFaulted);
    }

    // -- Forgot & Reset Password --

    public async Task ForgotPasswordAsync(ForgotPasswordRequest dto, string baseUrl)
    {
        var normalizedEmail = dto.Email.Trim();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);

        // Constant-time mitigation: equalize the cheap pre-email work so an attacker can't
        // distinguish an unknown email from a known one by measuring response latency.
        // Fire-and-forget covers the email-send latency; this covers the DB-write difference.
        if (user is null)
        {
            BCrypt.Net.BCrypt.Verify(Guid.NewGuid().ToString(), DummyPasswordHash);
            return;
        }

        var resetToken = await _passwordResetTokenRepository.CreateAsync(user.Id);
        var resetLink  = $"{baseUrl}/reset-password?token={resetToken.Token}";

        // Fire-and-forget so response time doesn't leak account existence via email-provider latency.
        _ = _emailService.SendPasswordResetEmailAsync(user.Email, resetLink)
            .ContinueWith(_ => { }, TaskContinuationOptions.OnlyOnFaulted);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest dto)
    {
        if (dto.Token is null || dto.Token == Guid.Empty)
            throw new ArgumentException("Token is invalid or has expired.");

        // Atomically mark the token used and retrieve the owner — single UPDATE ... RETURNING
        // closes the TOCTOU window that a Get → Update → Mark sequence leaves open under concurrency.
        var userId = await _passwordResetTokenRepository.ConsumeAsync(dto.Token.Value);
        if (userId is null)
            throw new ArgumentException("Token is invalid or has expired.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepository.UpdatePasswordAsync(userId.Value, newHash);

        // Revoke every refresh token for this user so any session opened with the
        // old password (legitimate or attacker-held) can no longer mint access tokens.
        await _refreshTokenRepository.RevokeAllForUserAsync(userId.Value);
    }

    // -- Private Helpers --

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    // Canonicalizes valid Lebanese mobile numbers to E.164 (+961XXXXXXXX)
    // so different input formats collide on the uniqueness check.
    private static string NormalizePhone(string phone)
    {
        var digits = System.Text.RegularExpressions.Regex.Replace(phone, @"\D", string.Empty);
        if (digits.StartsWith("961")) return "+" + digits;
        if (digits.StartsWith("0"))   return "+961" + digits[1..];
        return "+961" + digits;
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private int GetAccessTokenExpiryMinutes()
        => int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var parsed) ? parsed : 15;

    private int GetRefreshTokenExpiryDays()
        => int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var parsed) ? parsed : 7;

    private string GenerateJwtToken(int userId, string username, string email, IEnumerable<string> roles, int expiryMinutes)
    {
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured.");

        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,        userId.ToString()),
            new(JwtRegisteredClaimNames.Email,      email),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer:            _configuration["Jwt:Issuer"],
            audience:          _configuration["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

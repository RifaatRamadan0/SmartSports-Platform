using SmartSports.BLL.DTOs.User;
using SmartSports.BLL.Interfaces.Auth;
using SmartSports.BLL.Interfaces.User;
using SmartSports.DAL.Interfaces.Auth;

namespace SmartSports.BLL.Services.User;

public class UserService(
    IUserRepository userRepository,
    ITwilioService twilioService,
    IRefreshTokenRepository refreshTokenRepository) : IUserService
{
    public async Task<UserProfileResponse> GetProfileAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = await userRepository.GetUserRolesAsync(userId);
        return MapToResponse(user, roles);
    }

    public async Task<UserProfileResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        if (request.ProfilePicture != null &&
            !request.ProfilePicture.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Profile picture must be a valid HTTPS URL.");

        var rowUpdated = await userRepository.UpdateProfileAsync(
            userId,
            request.Username,
            request.PhoneNumber,
            request.ProfilePicture,
            request.SkillLevel,
            request.PreferredPosition);

        if (!rowUpdated)
            throw new KeyNotFoundException("User not found.");

        var updated = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        var roles = await userRepository.GetUserRolesAsync(userId);
        return MapToResponse(updated, roles);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ArgumentException("Current password is incorrect.");

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            throw new ArgumentException("New password must be different from the current password.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await userRepository.UpdatePasswordAsync(userId, newHash);

        // Revoke every refresh token — including the caller's own — so a changed password
        // locks out anyone holding an old token (e.g. after a suspected compromise). This
        // also kills the current session's refresh token, so the controller re-mints a
        // fresh session for the caller afterwards to keep this device signed in.
        await refreshTokenRepository.RevokeAllForUserAsync(userId);
    }

    public async Task SendPhoneVerificationAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.IsPhoneVerified)
            throw new ArgumentException("Phone number is already verified.");

        await twilioService.SendOtpAsync(user.PhoneNumber);
    }

    public async Task ConfirmPhoneVerificationAsync(int userId, string code)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var verified = await twilioService.VerifyOtpAsync(user.PhoneNumber, code);
        if (!verified)
            throw new ArgumentException("The code is incorrect or has expired.");

        await userRepository.VerifyPhoneAsync(userId);
    }

    public async Task DeleteOwnAccountAsync(int userId, DeleteAccountRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ArgumentException("Current password is incorrect.");

        var roles = await userRepository.GetUserRolesAsync(userId);
        if (roles.Contains("Admin"))
            throw new ArgumentException("Admin accounts cannot be deleted from settings.");

        if (await userRepository.HasActiveFutureBookingsAsync(userId))
            throw new ArgumentException(
                "You have active upcoming bookings. Cancel them before deleting your account.");

        // Atomically retire the account: the user row is anonymized + stamped
        // deleted_at, any pitches they own are taken down (so they don't linger as
        // live, unmanageable listings), and every refresh token is revoked. The
        // booking guard above guarantees none of those pitches have upcoming bookings.
        await userRepository.SoftDeleteAsync(userId);
    }

    private static UserProfileResponse MapToResponse(
        SmartSports.Domain.Entities.User user, IEnumerable<string> roles) => new()
    {
        Id                = user.Id,
        Username          = user.Username,
        Email             = user.Email,
        PhoneNumber       = user.PhoneNumber,
        ProfilePicture    = user.ProfilePicture,
        SkillLevel        = user.SkillLevel,
        PreferredPosition = user.PreferredPosition,
        IsEmailVerified   = user.IsEmailVerified,
        IsPhoneVerified   = user.IsPhoneVerified,
        CreatedAt         = user.CreatedAt,
        Roles             = roles,
    };
}

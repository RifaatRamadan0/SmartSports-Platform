using SmartSports.BLL.DTOs.User;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Auth;
using SmartSports.DAL.Interfaces.Pitch;

namespace SmartSports.BLL.Services;

public class UserService(
    IUserRepository userRepository,
    ITwilioService twilioService,
    IRefreshTokenRepository refreshTokenRepository,
    IPitchRepository pitchRepository) : IUserService
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

        var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await userRepository.UpdatePasswordAsync(userId, newHash);
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

        // Take down any pitches this user owns so they don't linger as live,
        // unmanageable listings. The booking guard above guarantees none have
        // upcoming bookings.
        await pitchRepository.SoftDeleteByOwnerAsync(userId);
        await userRepository.SoftDeleteAsync(userId);
        await refreshTokenRepository.RevokeAllForUserAsync(userId);
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

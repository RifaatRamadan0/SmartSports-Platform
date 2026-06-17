using SmartSports.BLL.DTOs.User;

namespace SmartSports.BLL.Interfaces;

public interface IUserService
{
    Task<UserProfileResponse> GetProfileAsync(int userId);
    Task<UserProfileResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task SendPhoneVerificationAsync(int userId);
    Task ConfirmPhoneVerificationAsync(int userId, string code);
    Task DeleteOwnAccountAsync(int userId, DeleteAccountRequest request);
}

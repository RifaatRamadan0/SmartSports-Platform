namespace SmartSports.BLL.Interfaces.Auth;

public interface IPhoneProofService
{
    string GenerateProof(string phoneNumber);
    bool ValidateProof(string token, string phoneNumber);
}

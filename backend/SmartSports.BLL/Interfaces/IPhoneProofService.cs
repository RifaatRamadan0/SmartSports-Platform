namespace SmartSports.BLL.Interfaces;

public interface IPhoneProofService
{
    string GenerateProof(string phoneNumber);
    bool ValidateProof(string token, string phoneNumber);
}

using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces.Lookup;

public interface ICityService
{
    Task<IEnumerable<CityResponse>> ListAsync();
}

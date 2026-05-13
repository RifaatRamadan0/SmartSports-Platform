using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces;

public interface ICityService
{
    Task<IEnumerable<CityResponse>> ListAsync();
}

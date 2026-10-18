using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces.Lookup;

public interface ILookupService
{
    Task<IEnumerable<CityResponse>>      ListCitiesAsync();
    Task<IEnumerable<SportTypeResponse>> ListSportTypesAsync();
}

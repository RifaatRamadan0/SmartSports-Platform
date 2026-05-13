using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces;

public interface ILookupService
{
    Task<IEnumerable<CityResponse>>      ListCitiesAsync();
    Task<IEnumerable<SportTypeResponse>> ListSportTypesAsync();
}

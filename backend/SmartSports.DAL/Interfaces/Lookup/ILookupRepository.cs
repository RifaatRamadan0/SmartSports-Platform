using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Lookup;

public interface ILookupRepository
{
    Task<IEnumerable<CityRow>>      ListCitiesAsync();
    Task<IEnumerable<SportTypeRow>> ListSportTypesAsync();
}

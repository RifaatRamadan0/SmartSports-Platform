using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Lookup;

public interface ICityRepository
{
    Task<IEnumerable<CityRow>> ListAsync();
}

using SmartSports.Domain.Entities.Projections;

namespace SmartSports.DAL.Interfaces.Lookup;

public interface ISportTypeRepository
{
    Task<IEnumerable<LookupRow>> ListAsync();
}

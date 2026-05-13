using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Lookup;

namespace SmartSports.BLL.Services;

public class CityService : ICityService
{
    private readonly ICityRepository _repo;

    public CityService(ICityRepository repo)
    {
        _repo = repo;
    }

    public async Task<IEnumerable<CityResponse>> ListAsync()
    {
        var rows = await _repo.ListAsync();
        return rows.Select(r => new CityResponse { Id = r.Id, Name = r.Name, RegionId = r.RegionId, RegionName = r.RegionName });
    }
}

using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces.Lookup;
using SmartSports.DAL.Interfaces.Lookup;

namespace SmartSports.BLL.Services.Lookup;

public class LookupService : ILookupService
{
    private readonly ILookupRepository _lookupRepository;

    public LookupService(ILookupRepository lookupRepository)
    {
        _lookupRepository = lookupRepository;
    }

    public async Task<IEnumerable<CityResponse>> ListCitiesAsync()
    {
        var rows = await _lookupRepository.ListCitiesAsync();
        return rows.Select(r => new CityResponse
        {
            Id         = r.Id,
            Name       = r.Name,
            RegionId   = r.RegionId,
            RegionName = r.RegionName,
        });
    }

    public async Task<IEnumerable<SportTypeResponse>> ListSportTypesAsync()
    {
        var rows = await _lookupRepository.ListSportTypesAsync();
        return rows.Select(r => new SportTypeResponse
        {
            Id   = r.Id,
            Name = r.Name,
        });
    }
}

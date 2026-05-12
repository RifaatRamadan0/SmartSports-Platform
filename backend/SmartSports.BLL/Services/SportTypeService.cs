using SmartSports.BLL.DTOs.Lookup;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Lookup;

namespace SmartSports.BLL.Services;

public class SportTypeService : ISportTypeService
{
    private readonly ISportTypeRepository _repo;

    public SportTypeService(ISportTypeRepository repo)
    {
        _repo = repo;
    }

    public async Task<IEnumerable<SportTypeResponse>> ListAsync()
    {
        var rows = await _repo.ListAsync();
        return rows.Select(r => new SportTypeResponse { Id = r.Id, Name = r.Name });
    }
}

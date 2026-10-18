using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces.Lookup;

public interface ISportTypeService
{
    Task<IEnumerable<SportTypeResponse>> ListAsync();
}

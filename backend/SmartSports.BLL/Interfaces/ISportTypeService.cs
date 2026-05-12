using SmartSports.BLL.DTOs.Lookup;

namespace SmartSports.BLL.Interfaces;

public interface ISportTypeService
{
    Task<IEnumerable<SportTypeResponse>> ListAsync();
}

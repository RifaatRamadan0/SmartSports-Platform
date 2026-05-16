using SmartSports.BLL.DTOs.Admin;
using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Enums;

namespace SmartSports.BLL.Services;

public class AdminPitchService : IAdminPitchService
{
    private readonly IPitchRepository _pitchRepository;

    public AdminPitchService(IPitchRepository pitchRepository)
    {
        _pitchRepository = pitchRepository;
    }

    public async Task<PagedResult<AdminPitchSummaryResponse>> GetPendingPitchesAsync(int page, int pageSize)
    {
        if (page     < 1)   page     = 1;
        if (pageSize < 1)   pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (rows, total) = await _pitchRepository.ListPendingAsync(page, pageSize);

        var items = rows.Select(r => new AdminPitchSummaryResponse
        {
            Id            = r.Id,
            Name          = r.Name,
            Address       = r.Address,
            PricePerHour  = r.PricePerHour,
            SportName     = r.SportName,
            CityName      = r.CityName,
            OwnerName     = r.OwnerName,
            OwnerId       = r.OwnerId,
            Status        = r.Status,
            CreatedAt     = r.CreatedAt,
            CoverImageUrl = r.CoverImageUrl,
            Images        = r.Images,
        });

        return new PagedResult<AdminPitchSummaryResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
    }

    public async Task ApproveAsync(int pitchId)
    {
        var updated = await _pitchRepository.UpdateStatusAsync(pitchId, PitchStatus.Approved);
        if (!updated)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");
    }

    public async Task RejectAsync(int pitchId, string? reason)
    {
        var updated = await _pitchRepository.UpdateStatusAsync(pitchId, PitchStatus.Rejected, reason);
        if (!updated)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");
    }
}

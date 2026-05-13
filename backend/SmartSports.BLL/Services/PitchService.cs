using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.Domain.Exceptions;
using PitchEntity = SmartSports.Domain.Entities.Pitch;

namespace SmartSports.BLL.Services;

public class PitchService : IPitchService
{
    private readonly IPitchRepository _pitchRepository;

    public PitchService(IPitchRepository pitchRepository)
    {
        _pitchRepository = pitchRepository;
    }

    public async Task<PitchResponse> GetByIdAsync(int pitchId)
    {
        var pitch = await _pitchRepository.GetByIdAsync(pitchId);

        if (pitch is null || pitch.DeletedAt is not null || !pitch.IsActive || !pitch.IsApproved)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return ToResponse(pitch);
    }

    public async Task<PagedResult<PitchListResponse>> ListAsync(string? sport, int page, int pageSize)
    {
        if (page     < 1)   page     = 1;
        if (pageSize < 1)   pageSize = 12;
        if (pageSize > 100) pageSize = 100;

        var (rows, total) = await _pitchRepository.ListAsync(sport, page, pageSize);

        var items = rows.Select(r => new PitchListResponse
        {
            Id                        = r.Id,
            Name                      = r.Name,
            Address                   = r.Address,
            PricePerHour              = r.PricePerHour,
            Rating                    = r.Rating,
            SportName                 = r.SportName,
            MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
            IsActive                  = r.IsActive,
            IsApproved                = r.IsApproved,
        });

        return new PagedResult<PitchListResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
    }

    public async Task<IEnumerable<PitchListResponse>> ListMineAsync(int ownerId)
    {
        var rows = await _pitchRepository.ListByOwnerAsync(ownerId);

        return rows.Select(r => new PitchListResponse
        {
            Id                        = r.Id,
            Name                      = r.Name,
            Address                   = r.Address,
            PricePerHour              = r.PricePerHour,
            Rating                    = r.Rating,
            SportName                 = r.SportName,
            MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
            IsActive                  = r.IsActive,
            IsApproved                = r.IsApproved,
        });
    }

    public async Task<PitchResponse> GetOwnedByIdAsync(int ownerId, int pitchId)
    {
        var pitch = await GetOwnedPitchOrThrowAsync(ownerId, pitchId);
        return ToResponse(pitch);
    }

    public async Task<PitchResponse> CreateAsync(int ownerId, CreatePitchRequest request)
    {
        ValidateMaxDurationStep(request.MaxBookingDurationMinutes);

        var pitch = new PitchEntity
        {
            OwnerId                   = ownerId,
            CityId                    = request.CityId,
            SportTypeId               = request.SportTypeId,
            Name                      = request.Name.Trim(),
            Address                   = request.Address.Trim(),
            PricePerHour              = request.PricePerHour,
            Latitude                  = request.Latitude,
            Longitude                 = request.Longitude,
            MaxBookingDurationMinutes = request.MaxBookingDurationMinutes,
            IsActive                  = true,
            IsApproved                = false,
        };

        pitch.Id = await _pitchRepository.InsertAsync(pitch);

        // Re-read so created_at, etc. reflect the DB-side defaults.
        var created = await _pitchRepository.GetByIdAsync(pitch.Id)
            ?? throw new InvalidOperationException("Pitch was inserted but could not be re-read.");

        return ToResponse(created);
    }

    public async Task<PitchResponse> UpdateAsync(int ownerId, int pitchId, UpdatePitchRequest request)
    {
        ValidateMaxDurationStep(request.MaxBookingDurationMinutes);

        var existing = await GetOwnedPitchOrThrowAsync(ownerId, pitchId);

        existing.CityId                    = request.CityId;
        existing.SportTypeId               = request.SportTypeId;
        existing.Name                      = request.Name.Trim();
        existing.Address                   = request.Address.Trim();
        existing.PricePerHour              = request.PricePerHour;
        existing.Latitude                  = request.Latitude;
        existing.Longitude                 = request.Longitude;
        existing.MaxBookingDurationMinutes = request.MaxBookingDurationMinutes;
        existing.IsActive                  = request.IsActive;

        var updated = await _pitchRepository.UpdateAsync(existing);
        if (!updated)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        var fresh = await _pitchRepository.GetByIdAsync(pitchId)
            ?? throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return ToResponse(fresh);
    }

    public async Task SoftDeleteAsync(int ownerId, int pitchId)
    {
        _ = await GetOwnedPitchOrThrowAsync(ownerId, pitchId);

        var deleted = await _pitchRepository.SoftDeleteAsync(pitchId);
        if (!deleted)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");
    }

    private async Task<PitchEntity> GetOwnedPitchOrThrowAsync(int ownerId, int pitchId)
    {
        var pitch = await _pitchRepository.GetByIdAsync(pitchId);

        if (pitch is null || pitch.DeletedAt is not null)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        if (pitch.OwnerId != ownerId)
            throw new ForbiddenException("You do not own this pitch.");

        return pitch;
    }

    private static void ValidateMaxDurationStep(int minutes)
    {
        if (minutes % 30 != 0)
            throw new ArgumentException("MaxBookingDurationMinutes must be a multiple of 30.");
    }

    private static PitchResponse ToResponse(PitchEntity pitch) => new()
    {
        Id                        = pitch.Id,
        OwnerId                   = pitch.OwnerId,
        CityId                    = pitch.CityId,
        SportTypeId               = pitch.SportTypeId,
        Name                      = pitch.Name,
        Address                   = pitch.Address,
        PricePerHour              = pitch.PricePerHour,
        Latitude                  = pitch.Latitude,
        Longitude                 = pitch.Longitude,
        MaxBookingDurationMinutes = pitch.MaxBookingDurationMinutes,
        IsActive                  = pitch.IsActive,
        IsApproved                = pitch.IsApproved,
        CreatedAt                 = pitch.CreatedAt,
    };
}

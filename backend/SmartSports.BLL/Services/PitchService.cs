using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Parameters;
using SmartSports.Domain.Entities.Projections;
using SmartSports.Domain.Enums;
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

    public async Task<PitchDetailResponse> GetDetailAsync(int pitchId)
    {
        var (detail, images, schedule, reviewRows) = await _pitchRepository.GetDetailWithDataAsync(pitchId);

        if (detail is null)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return new PitchDetailResponse
        {
            Id                        = detail.Id,
            OwnerId                   = detail.OwnerId,
            Name                      = detail.Name,
            SportTypeName             = detail.SportTypeName,
            CityName                  = detail.CityName,
            Address                   = detail.Address,
            PricePerHour              = detail.PricePerHour,
            Rating                    = detail.Rating,
            MaxBookingDurationMinutes = detail.MaxBookingDurationMinutes,
            Capacity                  = detail.Capacity,
            Images                    = images,
            Schedule                  = schedule.Select(s => new ScheduleDayResponse
            {
                DayOfWeek = s.DayOfWeek,
                OpenTime  = s.OpenTime,
                CloseTime = s.CloseTime,
                IsActive  = s.IsActive,
            }),
            RecentReviews             = reviewRows.Select(r => new ReviewSummary
            {
                Id           = r.Id,
                ReviewerName = r.ReviewerName,
                Rating       = r.Rating,
                Comment      = r.Comment,
                CreatedAt    = r.CreatedAt,
            }),
        };
    }

    public async Task<PagedResult<PitchListResponse>> ListAsync(PitchSearchQuery query)
    {
        // Clamp pagination bounds.
        if (query.Page     < 1)   query.Page     = 1;
        if (query.PageSize < 1)   query.PageSize = 12;
        if (query.PageSize > 100) query.PageSize = 100;

        // Discard nonsensical price ceiling.
        if (query.MaxPrice.HasValue && query.MaxPrice <= 0)
            query.MaxPrice = null;

        var filters = new PitchFilterParams(
            Search:   query.Search?.Trim(),
            Sport:    query.Sport?.Trim(),
            City:     query.City?.Trim(),
            MaxPrice: query.MaxPrice,
            SortBy:   query.SortBy?.Trim(),
            Page:     query.Page,
            PageSize: query.PageSize
        );

        var (rows, total) = await _pitchRepository.ListAsync(filters);

        var items = rows.Select(r => new PitchListResponse
        {
            Id                        = r.Id,
            Name                      = r.Name,
            Address                   = r.Address,
            PricePerHour              = r.PricePerHour,
            Rating                    = r.Rating,
            SportName                 = r.SportName,
            MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
            Capacity                  = r.Capacity,
            CityName                  = r.CityName,
            CoverImageUrl             = r.CoverImageUrl,
            ImageCount                = r.ImageCount,
            IsActive = r.IsActive,
            Status   = r.Status,
        });

        return new PagedResult<PitchListResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = query.Page,
            PageSize   = query.PageSize,
        };
    }

    public async Task<PagedResult<PitchListResponse>> ListMineAsync(int ownerId, int page, int pageSize)
    {
        if (page     < 1)  page     = 1;
        if (pageSize < 1)  pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (rows, total) = await _pitchRepository.ListByOwnerAsync(ownerId, page, pageSize);

        return new PagedResult<PitchListResponse>
        {
            Items = rows.Select(r => new PitchListResponse
            {
                Id                        = r.Id,
                Name                      = r.Name,
                Address                   = r.Address,
                PricePerHour              = r.PricePerHour,
                Rating                    = r.Rating,
                SportName                 = r.SportName,
                MaxBookingDurationMinutes = r.MaxBookingDurationMinutes,
                Capacity                  = r.Capacity,
                CityName                  = r.CityName,
                CoverImageUrl             = r.CoverImageUrl,
                ImageCount                = r.ImageCount,
                IsActive = r.IsActive,
                Status   = r.Status,
            }),
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = page,
            PageSize   = pageSize,
        };
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
            Capacity                  = request.Capacity,
            IsActive = true,
            Status   = PitchStatus.PendingApproval,
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

        // No-op save: nothing the owner can edit changed, so don't write — and
        // crucially don't reset Status to PendingApproval for an already-approved pitch.
        if (!HasOwnerEditableChanges(existing, request))
            return ToResponse(existing);

        existing.CityId                    = request.CityId;
        existing.SportTypeId               = request.SportTypeId;
        existing.Name                      = request.Name.Trim();
        existing.Address                   = request.Address.Trim();
        existing.PricePerHour              = request.PricePerHour;
        existing.Latitude                  = request.Latitude;
        existing.Longitude                 = request.Longitude;
        existing.MaxBookingDurationMinutes = request.MaxBookingDurationMinutes;
        existing.Capacity                  = request.Capacity ?? existing.Capacity;
        existing.IsActive                  = request.IsActive;
        existing.Status                    = PitchStatus.PendingApproval;
        existing.RejectionReason           = null;

        var updated = await _pitchRepository.UpdateAsync(existing);
        if (!updated)
            throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        var fresh = await _pitchRepository.GetByIdAsync(pitchId)
            ?? throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        return ToResponse(fresh);
    }

    private static bool HasOwnerEditableChanges(PitchEntity existing, UpdatePitchRequest request) =>
        existing.CityId                    != request.CityId
        || existing.SportTypeId            != request.SportTypeId
        || existing.Name                   != request.Name.Trim()
        || existing.Address                != request.Address.Trim()
        || existing.PricePerHour           != request.PricePerHour
        || existing.Latitude               != request.Latitude
        || existing.Longitude              != request.Longitude
        || existing.MaxBookingDurationMinutes != request.MaxBookingDurationMinutes
        || (request.Capacity.HasValue && existing.Capacity != request.Capacity.Value)
        || existing.IsActive               != request.IsActive;

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
        Capacity                  = pitch.Capacity,
        IsActive        = pitch.IsActive,
        Status          = pitch.Status,
        RejectionReason = pitch.RejectionReason,
        CreatedAt       = pitch.CreatedAt,
    };
}

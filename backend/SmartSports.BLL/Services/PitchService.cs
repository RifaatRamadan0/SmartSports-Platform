using SmartSports.BLL.DTOs.Booking;
using SmartSports.BLL.DTOs.Pitch;
using SmartSports.BLL.Interfaces;
using SmartSports.DAL.Interfaces.Pitch;
using SmartSports.DAL.Parameters;

namespace SmartSports.BLL.Services;

public class PitchService : IPitchService
{
    private readonly IPitchRepository _pitchRepository;
    private readonly IReviewService   _reviewService;

    public PitchService(IPitchRepository pitchRepository, IReviewService reviewService)
    {
        _pitchRepository = pitchRepository;
        _reviewService   = reviewService;
    }

    public async Task<PitchDetailResponse> GetDetailAsync(int pitchId)
    {
        var detail = await _pitchRepository.GetDetailAsync(pitchId)
            ?? throw new KeyNotFoundException($"Pitch with ID {pitchId} was not found.");

        var imagesTask   = _pitchRepository.GetImagesAsync(pitchId);
        var scheduleTask = _pitchRepository.GetScheduleAsync(pitchId);
        var reviewsTask  = _reviewService.GetRecentByPitchAsync(pitchId, 5);

        await Task.WhenAll(imagesTask, scheduleTask, reviewsTask);

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
            Images                    = imagesTask.Result,
            Schedule                  = scheduleTask.Result.Select(s => new ScheduleDayResponse
            {
                DayOfWeek = s.DayOfWeek,
                OpenTime  = s.OpenTime,
                CloseTime = s.CloseTime,
                IsActive  = s.IsActive,
            }),
            RecentReviews             = reviewsTask.Result,
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
            CityName                  = r.CityName,
            CoverImageUrl             = r.CoverImageUrl,
        });

        return new PagedResult<PitchListResponse>
        {
            Items      = items,
            TotalCount = (int)Math.Min(total, int.MaxValue),
            Page       = query.Page,
            PageSize   = query.PageSize,
        };
    }
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAvailableSlots } from '../../services/Availability/availabilityService';
import { parseApiError } from '../../utils/errorUtils';

// Constants 
const SLOT_DURATION_MINUTES = 30;
const MIN_BOOKING_SLOTS     = 2;  // 1 hour minimum = 2 slots
const MAX_DAYS_AHEAD        = 30;

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                     'Jul','Aug','Sep','Oct','Nov','Dec'];

// Helpers 

// Date → "YYYY-MM-DD" for API (local date, not UTC)
const toApiDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "HH:MM:SS" → "HH:MM"
const formatTime = (timeStr) => timeStr.slice(0, 5);

// minutes → "1h", "1h 30m", "2h" etc.
const formatDuration = (minutes) => {
  if (minutes === 60)  return '1h';
  if (minutes === 90)  return '1h 30m';
  if (minutes === 120) return '2h';
  if (minutes === 150) return '2h 30m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// Build duration options from MaxConsecutiveSlots
// Each step is 1 slot (30 min), minimum is 2 slots (1h)
const getDurationOptions = (maxConsecutiveSlots) => {
  const options = [];
  for (let slots = MIN_BOOKING_SLOTS; slots <= maxConsecutiveSlots; slots++) {
    const minutes = slots * SLOT_DURATION_MINUTES;
    options.push({ minutes, label: formatDuration(minutes) });
  }
  return options;
};

// Generate next 30 days including today
const generateDateOptions = () => {
  return Array.from({ length: MAX_DAYS_AHEAD + 1 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    return date;
  });
};

// Sub-components

function DateStrip({ dates, selectedDate, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {dates.map((date, i) => {
        const isSelected = toApiDate(date) === toApiDate(selectedDate);
        const isToday = i === 0;

        return (
          <button
            key={toApiDate(date)}
            onClick={() => onSelect(date)}
            className={`
              flex flex-col items-center justify-center
              min-w-[52px] h-[64px] rounded-xl border
              transition-all duration-200 flex-shrink-0
              ${isSelected
                ? 'bg-green-500 border-green-500 text-black'
                : 'bg-[#0f0f0f] border-[#1f1f1f] text-neutral-400 hover:border-green-700 hover:text-white'
              }
            `}
          >
            <span className={`text-[9px] font-bold tracking-widest uppercase ${isSelected ? 'text-black' : 'text-neutral-600'}`}>
              {isToday ? 'Today' : DAY_NAMES[date.getDay()]}
            </span>
            <span className={`text-lg font-bold leading-none ${isSelected ? 'text-black' : 'text-white'}`}>
              {date.getDate()}
            </span>
            <span className={`text-[9px] font-semibold ${isSelected ? 'text-black' : 'text-neutral-600'}`}>
              {MONTH_NAMES[date.getMonth()]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SlotGrid({ slots, selectedSlot, onSlotClick, disabled }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {slots.map((slot) => {
        const isSelected   = selectedSlot?.startTime === slot.startTime;
        const isAvailable  = slot.isAvailable;

        return (
          <button
            key={slot.startTime}
            disabled={!isAvailable || disabled}
            onClick={() => onSlotClick(slot)}
            className={`
              relative flex flex-col items-center justify-center
              rounded-xl py-3 px-2 border text-xs font-semibold
              transition-all duration-200
              ${isSelected
                ? 'bg-green-500 border-green-500 text-black scale-105'
                : isAvailable
                  ? 'bg-[#0f1a12] border-[#1f3d26] text-white hover:border-green-500 hover:bg-[#162a1a] cursor-pointer'
                  : 'bg-[#0d0d0d] border-[#1a1a1a] text-neutral-700 cursor-not-allowed'
              }
            `}
          >
            <span className={`text-sm font-bold ${isSelected ? 'text-black' : isAvailable ? 'text-white' : 'text-neutral-700'}`}>
              {formatTime(slot.startTime)}
            </span>
            {!isAvailable && (
              <span className="text-[8px] font-bold tracking-widest uppercase text-neutral-700 mt-0.5">
                Taken
              </span>
            )}
            {isSelected && (
              <span className="text-[8px] font-bold tracking-widest uppercase text-black mt-0.5">
                Selected
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DurationSelector({ slot, onConfirm }) {
  const [selected, setSelected] = useState(null);
  const options = getDurationOptions(slot.maxConsecutiveSlots);

  

  const handleConfirm = () => {
    if (!selected) return;
    const [h, m] = slot.startTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes   = startMinutes + selected;

    if (endMinutes >= 24 * 60) return; // guard: slot gen should prevent this

    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0')
    const endMin  = (endMinutes % 60).toString().padStart(2, '0')

    onConfirm({
      startTime:       slot.startTime,
      endTime:         `${endHour}:${endMin}:00`,
      durationMinutes: selected,
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#1f3d26] bg-[#0a150c] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-green-500">
            Selected Slot
          </p>
          <p className="text-white font-bold text-lg">
            {formatTime(slot.startTime)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
            Max Duration
          </p>
          <p className="text-neutral-300 font-semibold text-sm">
            {formatDuration(slot.maxConsecutiveSlots * SLOT_DURATION_MINUTES)}
          </p>
        </div>
      </div>

      {/* Duration options */}
      <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-2">
        Select Duration
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map(({ minutes, label }) => (
          <button
            key={minutes}
            onClick={() => setSelected(minutes)}
            className={`
              px-4 py-2 rounded-xl text-sm font-bold border
              transition-all duration-200
              ${selected === minutes
                ? 'bg-green-500 border-green-500 text-black'
                : 'bg-transparent border-[#2a4a30] text-neutral-300 hover:border-green-500 hover:text-white'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selected}
        className={`
          mt-4 w-full rounded-xl py-3 text-sm font-bold
          tracking-wide transition-all duration-200
          ${selected
            ? 'bg-green-500 text-black hover:bg-green-400 active:scale-95'
            : 'bg-[#0f1a12] text-neutral-600 cursor-not-allowed border border-[#1f3d26]'
          }
        `}
      >
        {selected ? `Confirm ${formatTime(slot.startTime)} · ${formatDuration(selected)}` : 'Choose a duration'}
      </button>
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse"
        />
      ))}
    </div>
  );
}

// Main Component

/**
 * SlotPicker — lets a player pick a date, time slot, and duration.
 *
 * Props:
 *  - pitchId:        number  — the pitch to check availability for
 *  - onSlotSelected: fn      — called with { date, startTime, endTime, durationMinutes }
 *  - disabled:       bool    — locks the whole picker (e.g. while booking is processing)
 */
function SlotPicker({ pitchId, onSlotSelected, disabled = false }) {
  const dates = useMemo(() => generateDateOptions(), []);

  const [selectedDate,  setSelectedDate]  = useState(dates[0]);
  const [slots,         setSlots]         = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);
  const [selectedSlot,  setSelectedSlot]  = useState(null);

  // Fetch slots when date changes
  const fetchSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedSlot(null);
      const data = await getAvailableSlots(pitchId, toApiDate(selectedDate));
      setSlots(data);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load available slots.'));
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [pitchId, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // ── Handlers ──
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotClick = (slot) => {
    // Toggle off if already selected
    if (selectedSlot?.startTime === slot.startTime) {
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot(slot);
  };

  const handleConfirm = ({ startTime, endTime, durationMinutes }) => {
    onSlotSelected({
      date:            toApiDate(selectedDate),
      startTime,
      endTime,
      durationMinutes,
    });
  };

  // ── Render ──
  return (
    <div className="flex flex-col gap-6">

      {/* Date strip */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-3">
          Select Date
        </p>
        <DateStrip
          dates={dates}
          selectedDate={selectedDate}
          onSelect={handleDateSelect}
        />
      </div>

      {/* Slot grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
            Available Slots
          </p>
          {!isLoading && !error && slots.length > 0 && (
            <p className="text-[10px] text-neutral-600">
              {slots.filter(s => s.isAvailable).length} available
            </p>
          )}
        </div>

        {/* Loading */}
        {isLoading && <SlotSkeleton />}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-[#1a0f0f] px-4 py-3 text-sm text-red-400">
            <span>✕</span>
            <span>{error}</span>
            <button
              onClick={fetchSlots}
              className="ml-auto text-xs underline underline-offset-2 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty — pitch closed */}
        {!isLoading && !error && slots.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] py-10 gap-2">
            <span className="text-2xl">🏟️</span>
            <p className="text-sm font-semibold text-neutral-500">
              Pitch is closed on this day
            </p>
            <p className="text-xs text-neutral-700">
              Try selecting a different date
            </p>
          </div>
        )}

        {/* Slot grid */}
        {!isLoading && !error && slots.length > 0 && (
          <SlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSlotClick={handleSlotClick}
            disabled={disabled}
          />
        )}
      </div>

      {/* Duration selector — only shown when a slot is selected */}
      {selectedSlot && (
        <DurationSelector
          key={selectedSlot.startTime}
          slot={selectedSlot}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

export default SlotPicker;
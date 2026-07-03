import { useCallback } from 'react'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Converts "07:00:00" (backend TimeOnly) → "07:00" (HTML time input)
const toInputTime = (timeStr) => {
  if (!timeStr) return '08:00';
  return timeStr.slice(0, 5);
};

// Converts "07:00" (HTML time input) → "07:00:00" (backend TimeOnly)
const toApiTime = (inputTime) => `${inputTime}:00`;

function DayCard({ day, onChange, disabled }) {
  const isOpen = day.isActive;

  const handleToggle = () => {
    onChange({ ...day, isActive: !isOpen });
  };

  const handleTimeChange = (field, value) => {
    onChange({ ...day, [field]: toApiTime(value) });
  };

  return (
    <div
      className={`
        relative flex flex-col gap-4 rounded-2xl p-5 border transition-all duration-300
        ${isOpen
          ? 'bg-[var(--green-muted)] border-[var(--green-muted)] shadow-[0_0_24px_rgba(34,197,94,0.07)]'
          : 'bg-[var(--surface)] border-[var(--bg3)]'
        }
      `}
    >
      {/* Day name + Toggle */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-bold tracking-widest uppercase ${
            isOpen ? 'text-white' : 'text-[var(--text3)]'
          }`}
        >
          {DAY_LABELS[day.dayOfWeek]}
        </span>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label={`${DAY_LABELS[day.dayOfWeek]} availability`}
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none
            focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus-visible:ring-offset-black
            ${isOpen ? 'bg-[var(--green)]' : 'bg-[var(--text3)]'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
              transition-transform duration-300
              ${isOpen ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Divider */}
      <div className={`h-px ${isOpen ? 'bg-[var(--green-muted)]' : 'bg-[var(--bg3)]'}`} />

      {/* Time inputs */}
      <div className="flex flex-col gap-3">
        {/* Opens */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`open-${day.dayOfWeek}`}
            className={`text-[10px] font-semibold tracking-widest uppercase ${
              isOpen ? 'text-[var(--green)]' : 'text-[var(--text3)]'
            }`}
          >
            Opens
          </label>
          <input
            id={`open-${day.dayOfWeek}`}
            type="time"
            value={toInputTime(day.openTime)}
            disabled={!isOpen || disabled}
            onChange={(e) => handleTimeChange('openTime', e.target.value)}
            className={`
              w-full rounded-lg px-3 py-2 text-sm border bg-transparent
              transition-all duration-200
              focus:outline-none focus:ring-1 focus:ring-[var(--green)]
              [color-scheme:dark]
              ${isOpen
                ? 'text-white border-[var(--green-border)] hover:border-[var(--green-dim)]'
                : 'text-[var(--text3)] border-[var(--bg3)] cursor-not-allowed'
              }
            `}
          />
        </div>

        {/* Closes */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`close-${day.dayOfWeek}`}
            className={`text-[10px] font-semibold tracking-widest uppercase ${
              isOpen ? 'text-[var(--green)]' : 'text-[var(--text3)]'
            }`}
          >
            Closes
          </label>
          <input
            id={`close-${day.dayOfWeek}`}
            type="time"
            value={toInputTime(day.closeTime)}
            disabled={!isOpen || disabled}
            onChange={(e) => handleTimeChange('closeTime', e.target.value)}
            className={`
              w-full rounded-lg px-3 py-2 text-sm border bg-transparent
              transition-all duration-200
              focus:outline-none focus:ring-1 focus:ring-[var(--green)]
              [color-scheme:dark]
              ${isOpen
                ? 'text-white border-[var(--green-border)] hover:border-[var(--green-dim)]'
                : 'text-[var(--text3)] border-[var(--bg3)] cursor-not-allowed'
              }
            `}
          />
        </div>
      </div>

      {/* Closed label */}
      {!isOpen && (
        <div className="absolute bottom-4 right-5">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text3)]">
            Closed
          </span>
        </div>
      )}
    </div>
  );
}

function ScheduleGrid({ schedule, onChange, disabled = false }) {
  const handleDayChange = useCallback((updatedDay) => {
    const updatedSchedule = schedule.map((day) =>
      day.dayOfWeek === updatedDay.dayOfWeek ? updatedDay : day
    );
    onChange(updatedSchedule);
  }, [schedule, onChange]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {schedule.map((day) => (
        <DayCard
          key={day.dayOfWeek}
          day={day}
          onChange={handleDayChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export default ScheduleGrid;
import { DAY_NAMES_LONG } from '../../constants'

const formatTime = (timeSpan) => (timeSpan ? timeSpan.substring(0, 5) : '')

export default function WeeklySchedule({ schedule }) {
  const slotMap = Object.fromEntries(schedule.map(s => [s.dayOfWeek, s]))

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] overflow-hidden">
      {DAY_NAMES_LONG.map((day, i) => {
        const slot = slotMap[i]
        const open = slot?.isActive

        return (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.05] last:border-b-0 ${
              open ? '' : 'opacity-40'
            }`}
          >
            <span className={`text-sm font-medium ${open ? 'text-white' : 'text-[var(--text2)]'}`}>
              {day}
            </span>
            {open ? (
              <span className="text-sm text-[var(--green)] font-medium tabular-nums">
                {formatTime(slot.openTime)} – {formatTime(slot.closeTime)}
              </span>
            ) : (
              <span className="text-sm text-[var(--text3)]">Closed</span>
            )}
          </div>
        )
      })}
      {schedule.length === 0 && (
        <p className="px-4 py-6 text-sm text-[var(--text3)] text-center">No schedule published yet.</p>
      )}
    </div>
  )
}

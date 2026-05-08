import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getAvailableSlots } from '../../services/Availability/availabilityService'
import { createBooking } from '../../services/Booking/bookingService'
import { parseApiError } from '../../utils/errorUtils'
import Toast from '../../components/ui/Toast'

const SLOT_DURATION_MINUTES = 30
const MAX_DAYS_AHEAD        = 30
const VISIBLE_DATES         = 7
const INITIAL_VISIBLE_SLOTS = 8

const DAY_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
                     'JUL','AUG','SEP','OCT','NOV','DEC']

const DURATION_OPTIONS = [
  { minutes: 60,  label: '1 hr'   },
  { minutes: 90,  label: '1.5 hrs'},
  { minutes: 120, label: '2 hrs'  },
]

// Helpers
const toApiDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : '')

const formatDurationShort = (minutes) => {
  if (minutes === 60) return '1 hr'
  if (minutes === 90) return '1.5 hrs'
  if (minutes === 120) return '2 hrs'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hr` : `${h}.${m === 30 ? 5 : m} hrs`
}

const formatDateHeader = (date) =>
  `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`

const formatDateSummary = (date) =>
  `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`

const formatPrice = (amount, currency = '£') => `${currency}${amount.toFixed(2)}`

const generateDateOptions = () =>
  Array.from({ length: MAX_DAYS_AHEAD + 1 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    return date
  })

export default function BookingPage() {
  const { pitchId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const {
    pricePerHour,
    pitchName,
    sport,
    surface,
    format,
    rating,
    ratingCount,
    amenities,
    currency = '£',
  } = location.state || {}

  const dates = useMemo(() => generateDateOptions(), [])

  const [dateOffset,    setDateOffset]    = useState(0)
  const [selectedDate,  setSelectedDate]  = useState(dates[0])
  const [duration,      setDuration]      = useState(60)
  const [slots,         setSlots]         = useState([])
  const [isLoading,     setIsLoading]     = useState(false)
  const [error,         setError]         = useState(null)
  const [selectedSlot,  setSelectedSlot]  = useState(null)
  const [showAllSlots,  setShowAllSlots]  = useState(false)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [toast,         setToast]         = useState(null)

  const visibleDates = dates.slice(dateOffset, dateOffset + VISIBLE_DATES)
  const canPrevDate  = dateOffset > 0
  const canNextDate  = dateOffset + VISIBLE_DATES < dates.length

  const fetchSlots = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSelectedSlot(null)
      setShowAllSlots(false)
      const data = await getAvailableSlots(Number(pitchId), toApiDate(selectedDate))
      setSlots(data)
    } catch (err) {
      setError(parseApiError(err, 'Failed to load available slots.'))
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }, [pitchId, selectedDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Clear selected slot if the chosen duration no longer fits it
  useEffect(() => {
    if (!selectedSlot) return
    const requiredSlots = duration / SLOT_DURATION_MINUTES
    if (selectedSlot.maxConsecutiveSlots < requiredSlots) {
      setSelectedSlot(null)
    }
  }, [duration, selectedSlot])

  const requiredSlots = duration / SLOT_DURATION_MINUTES

  const slotIsBookable = (slot) =>
    slot.isAvailable && slot.maxConsecutiveSlots >= requiredSlots

  const isToday = toApiDate(selectedDate) === toApiDate(dates[0])
  const futureSlots = useMemo(() => {
    if (!isToday) return slots
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return slots.filter((slot) => {
      const [h, m] = slot.startTime.split(':').map(Number)
      return h * 60 + m > nowMinutes
    })
  }, [slots, isToday])

  const availableDurations = useMemo(
    () =>
      DURATION_OPTIONS.filter((opt) =>
        futureSlots.some(
          (s) => s.isAvailable && s.maxConsecutiveSlots >= opt.minutes / SLOT_DURATION_MINUTES,
        ),
      ),
    [futureSlots],
  )

  useEffect(() => {
    if (availableDurations.length === 0) return
    if (!availableDurations.some((d) => d.minutes === duration)) {
      setDuration(availableDurations[0].minutes)
    }
  }, [availableDurations, duration])

  const visibleSlots = showAllSlots ? futureSlots : futureSlots.slice(0, INITIAL_VISIBLE_SLOTS)
  const hiddenCount  = Math.max(0, futureSlots.length - INITIAL_VISIBLE_SLOTS)

  const totalPrice =
    selectedSlot && typeof pricePerHour === 'number'
      ? (duration / 60) * pricePerHour
      : null

  const handleSlotClick = (slot) => {
    if (!slotIsBookable(slot)) return
    setSelectedSlot((prev) => (prev?.startTime === slot.startTime ? null : slot))
  }

  const handleConfirm = async () => {
    if (!selectedSlot || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await createBooking({
        pitchId: Number(pitchId),
        bookingDate: toApiDate(selectedDate),
        startTime: selectedSlot.startTime,
        durationInMinutes: duration,
      })
      setToast({ type: 'success', message: 'Booking confirmed' })
      setTimeout(() => navigate('/my-bookings', { replace: true }), 600)
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError('This slot was just taken, please choose another.')
        setSelectedSlot(null)
        fetchSlots()
      } else if (status === 400) {
        setError(parseApiError(err, 'Please check the booking details.'))
      } else {
        setError(parseApiError(err, 'Could not complete booking.'))
      }
      setIsSubmitting(false)
    }
  }

  const ctaLabel = !selectedSlot
    ? 'Select a Time Slot'
    : isSubmitting
      ? 'Booking…'
      : 'Confirm Booking'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c0a] p-4 sm:p-8"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34, 197, 94, 0.18), transparent)',
      }}
    >
      <div className="w-full max-w-5xl rounded-3xl border border-[#1a1f1c] bg-[#0a0d0b] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 sm:px-8 py-5 border-b border-[#1a1f1c]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Select Date &amp; Time
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {pitchName || `Pitch #${pitchId}`}
              {sport ? ` · ${sport}` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border border-[#1f2622] bg-[#0f1411] text-neutral-400
                       hover:text-white hover:border-neutral-600 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Pitch info */}
        <div className="flex items-center gap-5 px-6 sm:px-8 py-5 border-b border-[#1a1f1c]">
          <PitchIcon />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {pitchName || 'Pitch'}
              {format ? <span className="text-neutral-400 font-medium"> — {format}</span> : null}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {[sport, surface, format].filter(Boolean).join(' · ')}
              {typeof rating === 'number' && (
                <>
                  {' '}· <span className="text-yellow-400">★</span>{' '}
                  <span className="text-neutral-300">{rating.toFixed(1)}</span>
                  {typeof ratingCount === 'number' && (
                    <span className="text-neutral-500"> ({ratingCount})</span>
                  )}
                </>
              )}
            </p>
            {Array.isArray(amenities) && amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 rounded-full border border-[#1f2622] bg-[#0f1411] text-xs text-neutral-300"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
          {typeof pricePerHour === 'number' && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold leading-none">
                <span className="text-neutral-500 text-lg align-top">{currency}</span>
                <span className="text-green-400">{Math.round(pricePerHour)}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">/hr</p>
            </div>
          )}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 sm:px-8 py-6">
          {/* Left: date + duration */}
          <div>
            <SectionLabel>Choose Date</SectionLabel>
            <div className="flex items-center gap-2">
              <ArrowButton
                disabled={!canPrevDate}
                onClick={() => setDateOffset((o) => Math.max(0, o - VISIBLE_DATES))}
                direction="left"
              />
              <div className="flex gap-2 flex-1 overflow-hidden">
                {visibleDates.map((date) => {
                  const isSelected = toApiDate(date) === toApiDate(selectedDate)
                  return (
                    <button
                      key={toApiDate(date)}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        flex-1 min-w-0 flex flex-col items-center justify-center
                        h-[64px] rounded-xl border transition-all duration-150
                        ${isSelected
                          ? 'bg-green-500 border-green-500 text-black'
                          : 'bg-[#0f1411] border-[#1f2622] text-neutral-300 hover:border-green-700'
                        }
                      `}
                    >
                      <span className={`text-[9px] font-bold tracking-widest ${isSelected ? 'text-black/70' : 'text-neutral-500'}`}>
                        {DAY_NAMES[date.getDay()]}
                      </span>
                      <span className={`text-base font-bold leading-tight ${isSelected ? 'text-black' : 'text-white'}`}>
                        {date.getDate()}
                      </span>
                      <span className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-black/40' : 'bg-green-500'}`} />
                    </button>
                  )
                })}
              </div>
              <ArrowButton
                disabled={!canNextDate}
                onClick={() =>
                  setDateOffset((o) => Math.min(dates.length - VISIBLE_DATES, o + VISIBLE_DATES))
                }
                direction="right"
              />
            </div>

            <div className="mt-8">
              <SectionLabel>Duration</SectionLabel>
              {availableDurations.length === 0 ? (
                <p className="text-xs text-neutral-600">No durations available for this date.</p>
              ) : (
                <div className="flex gap-3">
                  {availableDurations.map(({ minutes, label }) => {
                    const isSelected = duration === minutes
                    return (
                      <button
                        key={minutes}
                        onClick={() => setDuration(minutes)}
                        className={`
                          flex-1 py-3 rounded-xl border text-sm font-bold transition-all duration-150
                          ${isSelected
                            ? 'border-green-500 bg-[#0f1a12] text-green-400'
                            : 'border-[#1f2622] bg-[#0f1411] text-neutral-300 hover:border-green-700'
                          }
                        `}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: time slots */}
          <div>
            <SectionLabel>
              Available Times — {formatDateHeader(selectedDate)}
            </SectionLabel>

            {isLoading && <SlotSkeleton />}

            {!isLoading && error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-[#1a0f0f] px-4 py-3 text-sm text-red-400">
                <span>✕</span>
                <span className="flex-1">{error}</span>
                <button
                  onClick={fetchSlots}
                  className="text-xs underline underline-offset-2 hover:text-red-300"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && futureSlots.length === 0 && (
              <div className="rounded-xl border border-[#1f2622] bg-[#0f1411] py-10 text-center">
                <p className="text-sm text-neutral-500">
                  {slots.length === 0
                    ? 'Pitch is closed on this day'
                    : 'No more slots available today'}
                </p>
                <p className="text-xs text-neutral-600 mt-1">Try another date</p>
              </div>
            )}

            {!isLoading && !error && futureSlots.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {visibleSlots.map((slot) => {
                    const bookable   = slotIsBookable(slot)
                    const isSelected = selectedSlot?.startTime === slot.startTime
                    return (
                      <button
                        key={slot.startTime}
                        disabled={!bookable}
                        onClick={() => handleSlotClick(slot)}
                        className={`
                          flex flex-col items-center justify-center
                          py-3 rounded-xl border text-sm font-bold transition-all duration-150
                          ${isSelected
                            ? 'bg-green-500 border-green-500 text-black scale-[1.02]'
                            : bookable
                              ? 'bg-[#0f1411] border-[#1f2622] text-white hover:border-green-500'
                              : 'bg-[#0d0f0e] border-[#161a18] text-neutral-700 cursor-not-allowed'
                          }
                        `}
                      >
                        <span className={`text-base ${isSelected ? 'text-black' : bookable ? 'text-white' : 'text-neutral-700'}`}>
                          {formatTime(slot.startTime)}
                        </span>
                        <span className={`text-[10px] font-semibold mt-0.5 ${
                          isSelected
                            ? 'text-black/70'
                            : bookable
                              ? 'text-neutral-500'
                              : 'text-neutral-700'
                        }`}>
                          {slot.isAvailable ? formatDurationShort(duration) : 'Booked'}
                        </span>
                      </button>
                    )
                  })}

                  {!showAllSlots && hiddenCount > 0 && (
                    <button
                      onClick={() => setShowAllSlots(true)}
                      className="flex flex-col items-center justify-center py-3 rounded-xl
                                 border border-dashed border-[#2a4a30] bg-[#0a150c]
                                 text-green-400 hover:border-green-500 hover:bg-[#0f1a12]
                                 transition-all duration-150"
                      aria-label={`Show ${hiddenCount} more time slots`}
                    >
                      <span className="text-2xl leading-none font-bold">+</span>
                      <span className="text-[10px] font-bold tracking-wider mt-1">
                        {hiddenCount} more
                      </span>
                    </button>
                  )}
                </div>

                {showAllSlots && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllSlots(false)}
                    className="mt-3 text-xs text-neutral-500 hover:text-green-400 transition-colors"
                  >
                    Show fewer
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer summary + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                        px-6 sm:px-8 py-5 border-t border-[#1a1f1c] bg-[#080b09]">
          <div className="flex gap-8 text-sm">
            <SummaryCell
              label="Date"
              value={selectedSlot ? formatDateSummary(selectedDate) : '—'}
            />
            <SummaryCell
              label="Time"
              value={selectedSlot ? formatTime(selectedSlot.startTime) : '—'}
            />
            <SummaryCell
              label="Total"
              value={totalPrice !== null ? formatPrice(totalPrice, currency) : '—'}
              accent={totalPrice !== null}
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || isSubmitting}
            className={`
              rounded-xl px-6 py-3 text-sm font-bold tracking-wide
              transition-all duration-150
              ${selectedSlot && !isSubmitting
                ? 'bg-green-500 text-black hover:bg-green-400 active:scale-95'
                : 'bg-[#0f1a12] text-neutral-600 border border-[#1f3d26] cursor-not-allowed'
              }
            `}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// Sub-components

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-neutral-500 mb-3">
      {children}
    </p>
  )
}

function SummaryCell({ label, value, accent = false }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${accent ? 'text-green-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function ArrowButton({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous dates' : 'Next dates'}
      className={`
        w-8 h-[64px] rounded-xl border flex items-center justify-center text-sm
        transition-colors shrink-0
        ${disabled
          ? 'border-[#161a18] text-neutral-700 cursor-not-allowed'
          : 'border-[#1f2622] text-neutral-400 hover:text-white hover:border-green-700'
        }
      `}
    >
      {direction === 'left' ? '‹' : '›'}
    </button>
  )
}

function PitchIcon() {
  return (
    <div className="w-24 h-20 rounded-xl border border-[#1f3d26] bg-[#0a1a0e]
                    flex items-center justify-center shrink-0">
      <svg viewBox="0 0 80 56" className="w-16 h-12 text-green-700">
        <rect x="2" y="2" width="76" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="40" y1="2" x2="40" y2="54" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="40" cy="28" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="16" width="10" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="68" y="16" width="10" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[58px] rounded-xl bg-[#0f1411] border border-[#161a18] animate-pulse"
        />
      ))}
    </div>
  )
}

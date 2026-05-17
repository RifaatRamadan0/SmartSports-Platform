import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAvailableSlots } from '../../services/Availability/availabilityService'
import { createBooking } from '../../services/Booking/bookingService'
import { getPitchById } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import Toast from '../../components/ui/Toast'
import { springTransition, stepVariants, confirmCardVariants, buttonHover, buttonTap } from '../../lib/motion'
import PitchCover from '../../components/Pitch/PitchCover'
import GalleryModal from '../../components/Pitch/GalleryModal'
import { SLOT_DURATION_MINUTES, DAY_NAMES_ABBR, MONTH_NAMES } from '../../constants'

const MAX_DAYS_AHEAD        = 30
const VISIBLE_DATES         = 7
const INITIAL_VISIBLE_SLOTS = 8
const DEFAULT_MAX_DURATION  = 120  // fallback until pitch data arrives

const DAY_NAMES = DAY_NAMES_ABBR

// Helpers
const toApiDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : '')

const formatDurationShort = (minutes) => {
  if (minutes === 60)  return '1 hr'
  if (minutes === 90)  return '1.5 hrs'
  if (minutes === 120) return '2 hrs'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hrs` : `${h}h ${m}min`
}

const formatDateHeader = (date) =>
  `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`

const formatDateSummary = (date) =>
  `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`

const formatPrice = (amount, currency = '$') =>
  `${currency}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`

const generateDateOptions = () =>
  Array.from({ length: MAX_DAYS_AHEAD + 1 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    return date
  })

// Builds duration chip options in 30-min steps from 60 up to the pitch's max.
const buildDurationOptions = (maxMinutes) => {
  const options = []
  for (let m = 60; m <= Math.min(maxMinutes, 480); m += 30) {
    options.push({ minutes: m, label: formatDurationShort(m) })
  }
  return options.length > 0 ? options : [{ minutes: 60, label: '1 hr' }]
}

export default function BookingPage() {
  const { pitchId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const {
    pitchName,
    sport,
    surface,
    format,
    rating,
    ratingCount,
    amenities,
    currency = '$',
  } = location.state || {}

  const [pitch, setPitch] = useState(null)
  const [fetchError, setFetchError] = useState(false)
  const [lightboxOpen,  setLightboxOpen]  = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Always fetch full pitch detail — the optimistic state from the card
  // (name, price, duration) drives the first paint while the network call
  // hydrates the images array and any other up-to-date fields.
  useEffect(() => {
    let cancelled = false
    getPitchById(pitchId)
      .then((p) => { if (!cancelled) setPitch(p) })
      .catch(() => { if (!cancelled) setFetchError(true) })
    return () => { cancelled = true }
  }, [pitchId])

  // Use optimistic name/display info from location.state for fast first paint.
  // Price and duration limits come exclusively from the API response to prevent
  // spoofed location.state from ever showing a wrong price to the user.
  const resolvedName        = pitch?.name ?? pitchName
  const resolvedPrice       = pitch?.pricePerHour ?? null
  const resolvedMaxDuration = pitch?.maxBookingDurationMinutes ?? DEFAULT_MAX_DURATION

  const allDurationOptions = useMemo(
    () => buildDurationOptions(resolvedMaxDuration),
    [resolvedMaxDuration],
  )

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
  const [confirmed,     setConfirmed]     = useState(false)
  const [confirmedDetails, setConfirmedDetails] = useState(null)
  // SPDBTCP-247 — open matches show in the public games list and accept walk-on joiners;
  // private matches are invite-only. Max players is read from pitch.capacity (owner-set).
  const [isOpen,        setIsOpen]        = useState(true)

  const visibleDates = dates.slice(dateOffset, dateOffset + VISIBLE_DATES)
  const canPrevDate  = dateOffset > 0
  const canNextDate  = dateOffset + VISIBLE_DATES < dates.length

  const fetchSlots = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSelectedSlot(null)
      setShowAllSlots(false)
      setIsOpen(true)
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
      allDurationOptions.filter((opt) =>
        futureSlots.some(
          (s) => s.isAvailable && s.maxConsecutiveSlots >= opt.minutes / SLOT_DURATION_MINUTES,
        ),
      ),
    [futureSlots, allDurationOptions],
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
    typeof resolvedPrice === 'number'
      ? (duration / 60) * resolvedPrice
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
        isOpenToJoin: isOpen,
      })
      setConfirmedDetails({
        pitchName: resolvedName || `Pitch #${pitchId}`,
        date: formatDateSummary(selectedDate),
        time: formatTime(selectedSlot.startTime),
        total: totalPrice !== null ? formatPrice(totalPrice, currency) : null,
      })
      setConfirmed(true)
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const ctaLabel = !selectedSlot
    ? 'Select a Time Slot'
    : isSubmitting
      ? 'Booking…'
      : 'Confirm Booking'

  if (fetchError && !resolvedName && resolvedPrice == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c0a] p-8">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">Could not load pitch details.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-neutral-500 underline hover:text-white"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c0a] p-4 sm:p-8"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34, 197, 94, 0.18), transparent)',
      }}
    >
      <div className="w-full max-w-5xl rounded-3xl border border-[#1a1f1c] bg-[#0a0d0b] shadow-2xl overflow-hidden">
      <AnimatePresence mode="wait">
      {confirmed && confirmedDetails ? (
        <SuccessScreen
          key="success"
          details={confirmedDetails}
          onViewBookings={() => navigate('/my-bookings', { replace: true })}
        />
      ) : (
        <motion.div key="form" variants={stepVariants} initial="initial" animate="animate" exit="exit">
        {/* Header */}
        <div className="flex items-start justify-between px-6 sm:px-8 py-5 border-b border-[#1a1f1c]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Select Date &amp; Time
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {resolvedName || `Pitch #${pitchId}`}
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
          <PitchCover
            imageUrl={pitch?.images?.[0]}
            sport={sport ?? pitch?.sportTypeName}
            className="w-40 h-28 sm:w-56 sm:h-36 rounded-xl overflow-hidden shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {resolvedName || 'Pitch'}
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
          {typeof resolvedPrice === 'number' && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold leading-none">
                <span className="text-neutral-500 text-lg align-top">{currency}</span>
                <span className="text-green-400">
                  {Number.isInteger(resolvedPrice) ? resolvedPrice : resolvedPrice.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">/hr</p>
            </div>
          )}
        </div>

        {/* Gallery strip — only when there's more than one image */}
        {pitch?.images && pitch.images.length > 1 && (
          <GalleryStrip
            images={pitch.images}
            onOpen={(i) => { setLightboxIndex(i); setLightboxOpen(true) }}
          />
        )}

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
                        h-16 rounded-xl border transition-all duration-150
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
                    const optionPrice =
                      typeof resolvedPrice === 'number'
                        ? (minutes / 60) * resolvedPrice
                        : null
                    return (
                      <button
                        key={minutes}
                        onClick={() => setDuration(minutes)}
                        className={`
                          flex-1 py-3 rounded-xl border transition-all duration-150
                          flex flex-col items-center justify-center
                          ${isSelected
                            ? 'border-green-500 bg-[#0f1a12] text-green-400'
                            : 'border-[#1f2622] bg-[#0f1411] text-neutral-300 hover:border-green-700'
                          }
                        `}
                      >
                        <span className="text-sm font-bold">{label}</span>
                        {optionPrice !== null && (
                          <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-green-300' : 'text-neutral-500'}`}>
                            {formatPrice(optionPrice, currency)}
                          </span>
                        )}
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

        {/* Visibility (SPDBTCP-247) */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex items-center gap-4">
            <div className={`
              w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
              ${isOpen
                ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                : 'bg-blue-500/10 border border-blue-500/40 text-blue-400'
              }
            `}>
              {isOpen ? <GlobeIcon className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Match Visibility</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isOpen
                  ? 'Listed in Find Games — anyone can discover and request to join'
                  : 'Hidden from Find Games — only players you invite can join'}
              </p>
            </div>
            <div className="flex rounded-full bg-[#0f1411] border border-[#1f2622] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-pressed={isOpen}
                className={`
                  flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors
                  ${isOpen ? 'bg-green-500 text-black' : 'text-neutral-400 hover:text-white'}
                `}
              >
                <GlobeIcon className="w-3.5 h-3.5" />
                Open
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-pressed={!isOpen}
                className={`
                  flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors
                  ${!isOpen ? 'bg-blue-500 text-white' : 'text-neutral-400 hover:text-white'}
                `}
              >
                <LockIcon className="w-3.5 h-3.5" />
                Private
              </button>
            </div>
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
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">
                Visibility
              </p>
              <p className={`mt-1 text-sm font-bold flex items-center gap-1.5 ${
                isOpen ? 'text-green-400' : 'text-blue-400'
              }`}>
                {isOpen ? <GlobeIcon className="w-3.5 h-3.5" /> : <LockIcon className="w-3.5 h-3.5" />}
                {isOpen ? 'Open' : 'Private'}
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleConfirm}
            disabled={!selectedSlot || isSubmitting}
            whileHover={selectedSlot && !isSubmitting ? buttonHover : {}}
            whileTap={selectedSlot && !isSubmitting ? buttonTap : {}}
            className={`
              rounded-xl px-6 py-3 text-sm font-bold tracking-wide
              ${selectedSlot && !isSubmitting
                ? 'shimmer-btn text-black'
                : 'bg-[#0f1a12] text-neutral-600 border border-[#1f3d26] cursor-not-allowed'
              }
            `}
          >
            {ctaLabel}
          </motion.button>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        </motion.div>
      )}
      </AnimatePresence>
      </div>

      {lightboxOpen && pitch?.images && (
        <GalleryModal
          images={pitch.images}
          title={resolvedName}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
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
        w-8 h-16 rounded-xl border flex items-center justify-center text-sm
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

function GalleryStrip({ images, onOpen }) {
  const visible  = images.slice(0, 3)
  const overflow = images.length > 3
  return (
    <div className="flex gap-2 px-6 sm:px-8 pt-5 pb-5 overflow-x-auto">
      {visible.map((url, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i)}
          className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0
                      ${i === 0 ? 'ring-2 ring-green-500' : 'ring-1 ring-white/10 hover:ring-white/30'}`}
        >
          <img src={url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
      {overflow && (
        <button
          type="button"
          onClick={() => onOpen(3)}
          className="w-12 h-12 rounded-lg border-2 border-dashed border-white/15
                     text-[10px] text-neutral-400 hover:text-white hover:border-white/30
                     flex flex-col items-center justify-center gap-0.5 shrink-0"
        >
          <span>⤢</span>
          View all
        </button>
      )}
    </div>
  )
}

const CONFETTI_COLORS = ['#1DB954', '#FFD700', '#00B4D8', '#FFFFFF', '#7BC67E', '#FFB703']

function SuccessScreen({ details, onViewBookings }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${((i / 12) * 90) + 5}%`,
    delay: `${(i * 0.06).toFixed(2)}s`,
  }))

  return (
    <motion.div
      key="success"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex flex-col items-center justify-center py-16 px-8 overflow-hidden"
    >
      {particles.map(p => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{ backgroundColor: p.color, left: p.left, top: '10%', animationDelay: p.delay }}
        />
      ))}

      {/* Animated checkmark */}
      <svg width="120" height="120" viewBox="0 0 52 52" className="mb-6">
        <motion.circle
          cx="26" cy="26" r="24"
          fill="none" stroke="var(--green)" strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springTransition}
        />
        <motion.path
          fill="none" stroke="var(--green)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          d="M14 27l8 8 16-16"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div
        variants={confirmCardVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center"
      >
        <h2 className="text-2xl font-bold text-white mb-1">Booking Confirmed!</h2>
        <p className="text-neutral-400 mb-6 text-sm">Your pitch is booked. See you there!</p>

        <div className="rounded-2xl border border-[var(--green-border)] bg-[var(--bg2)] p-6 mb-6 w-full max-w-xs text-left space-y-3">
          {details.pitchName && <DetailRow label="Pitch" value={details.pitchName} />}
          {details.date      && <DetailRow label="Date"  value={details.date} />}
          {details.time      && <DetailRow label="Time"  value={details.time} />}
          {details.total     && <DetailRow label="Total" value={details.total} accent />}
        </div>

        <motion.button
          onClick={onViewBookings}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className="shimmer-btn rounded-xl px-8 py-3 text-sm font-bold text-[var(--primary-foreground)]"
        >
          View My Bookings →
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function DetailRow({ label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-[var(--green)]' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function GlobeIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function LockIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-14.5 rounded-xl bg-[#0f1411] border border-[#161a18]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

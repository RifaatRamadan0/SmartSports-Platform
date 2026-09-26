import { CANCEL_BUFFER_MS } from '../constants'

// Pitches are in Lebanon, so the pitch's timezone decides every deadline, not the
// viewer's. The API sends booking dates and times as wall-clock strings with no
// offset ("2026-09-21", "18:00:00"), which the browser would otherwise read in
// whatever zone the device is set to.
const PITCH_TZ = 'Asia/Beirut'

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: PITCH_TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const partsAt = instant =>
  Object.fromEntries(parts.formatToParts(instant).map(p => [p.type, p.value]))

// Beirut's offset from UTC at a given instant: +02:00 in winter, +03:00 in summer.
function offsetAt(instant) {
  const p = partsAt(instant)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant
}

// Beirut wall-clock -> epoch ms. Compare the result against Date.now(), which is
// timezone-free, so the viewer's zone cannot affect the outcome.
// Two passes: the first offset lookup uses an approximate instant that can land on
// the wrong side of a DST boundary; the second corrects it.
export function pitchTimeToInstant(dateStr, timeStr) {
  const naive = Date.parse(`${dateStr}T${timeStr}Z`)
  return naive - offsetAt(naive - offsetAt(naive))
}

// "Today" in Beirut as "YYYY-MM-DD". Not toISOString(), which renders UTC.
// Offsets are calendar days, matching DateOnly.AddDays on the backend — adding
// 24h per day instead would drift by one across a DST change.
export function pitchToday(offsetDays = 0) {
  const p = partsAt(Date.now())
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day))
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Beirut's calendar day as a local Date, so getDay()/getDate() and any local
// formatting read the day the pitch is on rather than the viewer's.
export function pitchDate(offsetDays = 0) {
  const [y, m, d] = pitchToday(offsetDays).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Minutes since midnight in Beirut. Mirrors the slot cutoff in AvailabilityService.
export function pitchMinutesNow() {
  const p = partsAt(Date.now())
  return Number(p.hour) * 60 + Number(p.minute)
}

// Mirrors the backend rules in BookingService and ReviewService. Keep the two in
// step: a disagreement shows the user a button the API then rejects.
export function isCancellable(booking) {
  if (booking.status !== 'confirmed') return false
  return pitchTimeToInstant(booking.bookingDate, booking.startTime) > Date.now() + CANCEL_BUFFER_MS
}

export function isReviewable(booking) {
  if (booking.status !== 'confirmed' || booking.hasReviewed) return false
  return pitchTimeToInstant(booking.bookingDate, booking.endTime) < Date.now()
}

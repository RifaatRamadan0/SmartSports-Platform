import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getBookingById, cancelBooking } from '../../services/Booking/bookingService'
import { updateMatchVisibility } from '../../services/Match/matchService'
import { parseApiError } from '../../utils/errorUtils'
import { getUserIdFromToken } from '../../utils/jwtUtils'

import { CANCEL_BUFFER_MS } from '../../constants'

const fmtDate = d =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

const fmtTime = t => t.slice(0, 5)

const fmtBookedAt = dt =>
  new Date(dt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

function durationLabel(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function isCancellable(booking) {
  if (booking.status !== 'confirmed') return false
  const start = new Date(`${booking.bookingDate}T${booking.startTime}`)
  return start.getTime() > Date.now() + CANCEL_BUFFER_MS
}

const STATUS_STYLES = {
  confirmed: 'bg-green-500/10 border-green-500/30 text-green-400',
  pending:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
  cancelled: 'bg-red-500/10  border-red-500/30  text-red-400',
}

function StatusBadge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase ${STATUS_STYLES[status] ?? ''}`}>
      {status}
    </span>
  )
}

// ── Cancel dialog ─────────────────────────────────────────────────────────────

function CancelDialog({ isSubmitting, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-1">Cancel booking?</h2>
        <p className="text-[13px] text-neutral-400 mb-5">
          This action cannot be undone. The slot will become available again.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          rows={3}
          className="w-full rounded-xl border border-[#2a2a2a] bg-[#080808] px-4 py-3
                     text-[13px] text-white placeholder-neutral-600 resize-none
                     focus:outline-none focus:border-red-500/50 mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold
                       border border-[#2a2a2a] text-neutral-300 hover:text-white transition-colors"
          >
            Keep booking
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold
                       bg-red-500/20 border border-red-500/40 text-red-400
                       hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Match visibility card (SPDBTCP-248) ───────────────────────────────────────

function MatchVisibilityCard({ match, canToggle, isFlipping, onToggle }) {
  const isOpen = !!match.isOpenToJoin
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] px-5 py-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-1">
            Match visibility
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase ${
              isOpen
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isOpen ? 'Open to join' : 'Private'}
            </span>
            <span className="text-[11px] text-neutral-500">· Max {match.maxPlayers} players</span>
          </div>
          <p className="text-[12px] text-neutral-500">
            {isOpen
              ? 'Listed publicly. Other players can find and join this match.'
              : 'Hidden from the public list. Only invited players can join.'}
          </p>
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            disabled={isFlipping}
            className={`shrink-0 self-center px-4 py-2 rounded-xl text-[12px] font-bold transition-colors
                       border disabled:opacity-50
                       ${isOpen
                         ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                         : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                       }`}
          >
            {isFlipping ? 'Saving…' : (isOpen ? 'Make private' : 'Open to others')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
      <span className="text-[12px] font-medium text-neutral-500 shrink-0">{label}</span>
      <span className={`text-[13px] font-semibold text-right ${valueClass}`}>{value}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { roles, token } = useAuth()
  const isPlayer = roles.includes(ROLES.PLAYER)
  const currentUserId = useMemo(() => getUserIdFromToken(token), [token])

  const [booking,      setBooking]      = useState(null)
  const [isFlipping,   setIsFlipping]   = useState(false)
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState(null)   // { type: '403'|'404'|'error', message }
  const [showDialog,   setShowDialog]   = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [toast,        setToast]        = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchBooking = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getBookingById(id)
      setBooking(data)
    } catch (err) {
      const status = err?.response?.status
      if (status === 403) setError({ type: '403', message: "You don't have permission to view this booking." })
      else if (status === 404) setError({ type: '404', message: 'This booking could not be found.' })
      else setError({ type: 'error', message: parseApiError(err, 'Failed to load booking.') })
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchBooking() }, [fetchBooking])

  // SPDBTCP-248 — owner-only toggle. Optimistic; rollback + toast on server failure.
  const handleVisibilityToggle = async () => {
    if (!booking?.match || isFlipping) return
    const next = !booking.match.isOpenToJoin
    setIsFlipping(true)
    setBooking(b => ({ ...b, match: { ...b.match, isOpenToJoin: next } }))
    try {
      const updated = await updateMatchVisibility(booking.match.id, next)
      setBooking(b => ({ ...b, match: updated }))
      showToast(next ? 'Match is now open to others.' : 'Match is now private.')
    } catch (err) {
      setBooking(b => ({ ...b, match: { ...b.match, isOpenToJoin: !next } }))
      const status = err?.response?.status
      const msg = status === 403
        ? 'Only the booking owner can change visibility.'
        : parseApiError(err, 'Could not update visibility.')
      showToast(msg, 'error')
    } finally {
      setIsFlipping(false)
    }
  }

  const handleCancel = async (reason) => {
    setIsCancelling(true)
    try {
      await cancelBooking(id, reason)
      setShowDialog(false)
      showToast('Booking cancelled.')
      fetchBooking()
    } catch (err) {
      setShowDialog(false)
      showToast(parseApiError(err, 'Could not cancel booking.'), 'error')
    } finally {
      setIsCancelling(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-32 rounded-lg bg-[#141414] animate-pulse mb-10" />
          <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-[#141414] animate-pulse" style={{ width: `${60 + i * 6}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] font-semibold text-neutral-400 hover:text-white transition-colors mb-10"
          >
            ← Back
          </button>
          <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-10 text-center">
            <p className="text-3xl mb-3">{error.type === '403' ? '🔒' : error.type === '404' ? '🔍' : '⚠️'}</p>
            <p className="text-white font-semibold mb-1">
              {error.type === '403' ? 'Access denied' : error.type === '404' ? 'Not found' : 'Something went wrong'}
            </p>
            <p className="text-[13px] text-neutral-500">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  const canCancel = isPlayer && isCancellable(booking)

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
      {showDialog && (
        <CancelDialog
          isSubmitting={isCancelling}
          onConfirm={handleCancel}
          onClose={() => setShowDialog(false)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
          rounded-xl shadow-2xl border text-sm font-medium
          ${toast.type === 'success'
            ? 'bg-[#0f1a12] border-green-600 text-green-400'
            : 'bg-[#1a0f0f] border-red-600 text-red-400'}`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <StatusBadge status={booking.status} />
        </div>

        {/* Title */}
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-green-500 mb-1">Booking</p>
          <h1 className="text-3xl font-bold tracking-tight">
            #{String(booking.id).padStart(6, '0')}
          </h1>
        </div>

        {/* Pitch card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-5 mb-4
                        flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-1">Pitch</p>
            <p className="text-[15px] font-bold text-white">{booking.pitchName}</p>
          </div>
          <button
            onClick={() => navigate(`/pitches/${booking.pitchId}`)}
            className="shrink-0 text-[12px] font-bold text-green-400 hover:text-green-300 transition-colors"
          >
            View →
          </button>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] px-5 mb-4">
          <DetailRow label="Date"      value={fmtDate(booking.bookingDate)} />
          <DetailRow
            label="Time"
            value={`${fmtTime(booking.startTime)} → ${fmtTime(booking.endTime)}`}
          />
          <DetailRow label="Duration"  value={durationLabel(booking.startTime, booking.endTime)} />
          <DetailRow label="Price"     value={`$${Number(booking.totalPrice).toFixed(2)}`} />
          <DetailRow label="Booked on" value={fmtBookedAt(booking.bookedAt)} valueClass="text-neutral-400" />
        </div>

        {/* Cancellation reason */}
        {booking.status === 'cancelled' && booking.cancellationReason && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 mb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-red-400/70 mb-1">Cancellation reason</p>
            <p className="text-[13px] text-red-300">{booking.cancellationReason}</p>
          </div>
        )}

        {/* Match visibility (SPDBTCP-248) */}
        {booking.match && (
          <MatchVisibilityCard
            match={booking.match}
            canToggle={isPlayer && currentUserId === booking.userId && booking.status === 'confirmed'}
            isFlipping={isFlipping}
            onToggle={handleVisibilityToggle}
          />
        )}

        {/* Upcoming: payment, chat, edit */}
        <div className="rounded-2xl border border-dashed border-white/[0.05] px-5 py-4 mb-6">
          <p className="text-[11px] text-neutral-600">
            Coming soon: payment info · messaging · booking edit
          </p>
        </div>

        {/* Cancel action */}
        {canCancel && (
          <button
            onClick={() => setShowDialog(true)}
            className="w-full py-3 rounded-2xl border border-red-500/30 bg-red-500/10
                       text-[13px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  )
}

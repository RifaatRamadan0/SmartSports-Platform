import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getBookingById, cancelBooking } from '../../services/Booking/bookingService'
import { updateMatchVisibility } from '../../services/Match/matchService'
import { generateInviteLink } from '../../services/Invitation/invitationService'
import { createReview } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import { getUserIdFromToken } from '../../utils/jwtUtils'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StarRatingInput from '../../components/ui/StarRatingInput'
import { useToast } from '../../context/ToastContext'

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

function isReviewable(booking) {
  if (booking.status !== 'confirmed' || booking.hasReviewed) return false
  const end = new Date(`${booking.bookingDate}T${booking.endTime}`)
  return end.getTime() < Date.now()
}

const STATUS_STYLES = {
  confirmed: 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]',
  pending:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
  cancelled: 'bg-[var(--red)]/10  border-[var(--red)]/30  text-[var(--red)]',
}

function StatusBadge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase ${STATUS_STYLES[status] ?? ''}`}>
      {status}
    </span>
  )
}

// ── Match visibility card (SPDBTCP-248) ───────────────────────────────────────

function MatchVisibilityCard({ match, canToggle, isFlipping, onToggle, onShareLink }) {
  const isOpen = !!match.isOpenToJoin
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] px-5 py-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)] mb-1">
            Match visibility
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase ${
              isOpen
                ? 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isOpen ? 'Open to join' : 'Private'}
            </span>
            <span className="text-[11px] text-[var(--text3)]">· Max {match.maxPlayers} players</span>
          </div>
          <p className="text-[12px] text-[var(--text3)]">
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
                         : 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)] hover:bg-[var(--green)]/20'
                       }`}
          >
            {isFlipping ? 'Saving…' : (isOpen ? 'Make private' : 'Open to others')}
          </button>
        )}
      </div>
      {canToggle && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={onShareLink}
            className="w-full py-2 rounded-xl text-[12px] font-bold
                       border border-white/[0.08] bg-[var(--bg3)] text-[var(--text2)]
                       hover:text-white hover:border-white/[0.15] transition-colors"
          >
            ⎘ Share invite link
          </button>
        </div>
      )}
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
      <span className="text-[12px] font-medium text-[var(--text3)] shrink-0">{label}</span>
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
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [showReview,         setShowReview]         = useState(false)
  const [reviewRating,       setReviewRating]       = useState(0)
  const [reviewComment,      setReviewComment]      = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const toast = useToast()

  const closeDialog = () => { setShowDialog(false); setCancelReason('') }
  const closeReview = () => { setShowReview(false); setReviewRating(0); setReviewComment('') }

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

  // Fix #9: separate the two failure modes — generation failure vs. clipboard failure
  const handleShareLink = async () => {
    let shareUrl
    try {
      ;({ shareUrl } = await generateInviteLink(booking.match.id))
    } catch {
      toast.error('Could not generate invite link.')
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Invite link copied to clipboard!')
    } catch {
      toast.error('Could not copy — please copy the URL manually.')
    }
  }

  // SPDBTCP-248 — owner-only toggle. Optimistic; rollback + toast on server failure.
  const handleVisibilityToggle = async () => {
    if (!booking?.match || isFlipping) return
    const next = !booking.match.isOpenToJoin
    setIsFlipping(true)
    setBooking(b => ({ ...b, match: { ...b.match, isOpenToJoin: next } }))
    try {
      const updated = await updateMatchVisibility(booking.match.id, next)
      setBooking(b => ({ ...b, match: updated }))
      toast.success(next ? 'Match is now open to others.' : 'Match is now private.')
    } catch (err) {
      setBooking(b => ({ ...b, match: { ...b.match, isOpenToJoin: !next } }))
      const status = err?.response?.status
      const msg = status === 403
        ? 'Only the booking owner can change visibility.'
        : parseApiError(err, 'Could not update visibility.')
      toast.error(msg)
    } finally {
      setIsFlipping(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await cancelBooking(id, cancelReason.trim() || null)
      closeDialog()
      toast.success('Booking cancelled.')
      fetchBooking()
    } catch (err) {
      closeDialog()
      toast.error(parseApiError(err, 'Could not cancel booking.'))
    } finally {
      setIsCancelling(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-32 rounded-lg bg-[var(--bg3)] animate-pulse mb-10" />
          <div className="rounded-2xl border border-[var(--bg3)] bg-[var(--surface)] p-6 flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-[var(--bg3)] animate-pulse" style={{ width: `${60 + i * 6}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] font-semibold text-[var(--text2)] hover:text-white transition-colors mb-10"
          >
            ← Back
          </button>
          <div className="rounded-2xl border border-[var(--bg3)] bg-[var(--surface)] p-10 text-center">
            <p className="text-3xl mb-3">{error.type === '403' ? '🔒' : error.type === '404' ? '🔍' : '⚠️'}</p>
            <p className="text-white font-semibold mb-1">
              {error.type === '403' ? 'Access denied' : error.type === '404' ? 'Not found' : 'Something went wrong'}
            </p>
            <p className="text-[13px] text-[var(--text3)]">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmitReview = async () => {
    if (reviewRating < 1 || isSubmittingReview) return
    setIsSubmittingReview(true)
    try {
      await createReview(booking.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      })
      closeReview()
      toast.success('Thanks for your review!')
      fetchBooking()
    } catch (err) {
      toast.error(parseApiError(err, 'Could not submit review.'))
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  const canCancel = isPlayer && isCancellable(booking)
  const canReview = isPlayer && isReviewable(booking)
  // SPDBTCP-76 — the booking-detail API already 403s non-owner players, so
  // reaching this page as a Player means this booking belongs to them.
  const canManageMatch =
    isPlayer && booking.status === 'confirmed' && booking.match?.id != null

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">
      <ConfirmDialog
        isOpen={showDialog}
        title="Cancel booking?"
        message="This action cannot be undone. The slot will become available again."
        confirmLabel={isCancelling ? 'Cancelling…' : 'Yes, cancel'}
        cancelLabel="Keep booking"
        onConfirm={handleCancel}
        onCancel={closeDialog}
        isSubmitting={isCancelling}
        variant="danger"
      >
        <textarea
          value={cancelReason}
          onChange={e => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          rows={3}
          className="w-full rounded-xl border border-white/[0.08] bg-[var(--bg)] px-4 py-3
                     text-[13px] text-white placeholder-[var(--text3)] resize-none
                     focus:outline-none focus:border-[var(--red-border)]"
        />
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showReview}
        title="Rate your experience"
        message="How was your game at this pitch?"
        confirmLabel={isSubmittingReview ? 'Submitting…' : 'Submit review'}
        cancelLabel="Not now"
        onConfirm={handleSubmitReview}
        onCancel={closeReview}
        isSubmitting={isSubmittingReview || reviewRating < 1}
      >
        <div className="flex flex-col gap-3">
          <StarRatingInput
            value={reviewRating}
            onChange={setReviewRating}
            disabled={isSubmittingReview}
          />
          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Share a few words (optional)"
            rows={3}
            maxLength={1000}
            className="w-full rounded-xl border border-white/[0.08] bg-[var(--bg)] px-4 py-3
                       text-[13px] text-white placeholder-[var(--text3)] resize-none
                       focus:outline-none focus:border-[var(--green-border)]"
          />
        </div>
      </ConfirmDialog>

      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] font-semibold text-[var(--text2)] hover:text-white transition-colors"
          >
            ← Back
          </button>
          <StatusBadge status={booking.status} />
        </div>

        {/* Title */}
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-1">Booking</p>
          <h1 className="text-3xl font-bold tracking-tight">
            #{String(booking.id).padStart(6, '0')}
          </h1>
        </div>

        {/* Pitch card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5 mb-4
                        flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)] mb-1">Pitch</p>
            <p className="text-[15px] font-bold text-white">{booking.pitchName}</p>
          </div>
          <button
            onClick={() => navigate(`/pitches/${booking.pitchId}`)}
            className="shrink-0 text-[12px] font-bold text-[var(--green)] hover:text-[var(--green)] transition-colors"
          >
            View →
          </button>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] px-5 mb-4">
          <DetailRow label="Date"      value={fmtDate(booking.bookingDate)} />
          <DetailRow
            label="Time"
            value={`${fmtTime(booking.startTime)} → ${fmtTime(booking.endTime)}`}
          />
          <DetailRow label="Duration"  value={durationLabel(booking.startTime, booking.endTime)} />
          <DetailRow label="Price"     value={`$${Number(booking.totalPrice).toFixed(2)}`} />
          <DetailRow label="Booked on" value={fmtBookedAt(booking.bookedAt)} valueClass="text-[var(--text2)]" />
        </div>

        {/* Cancellation reason */}
        {booking.status === 'cancelled' && booking.cancellationReason && (
          <div className="rounded-2xl border border-[var(--red)]/20 bg-[var(--red)]/5 px-5 py-4 mb-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--red)]/70 mb-1">Cancellation reason</p>
            <p className="text-[13px] text-[var(--red)]">{booking.cancellationReason}</p>
          </div>
        )}

        {/* Match visibility (SPDBTCP-248) */}
        {booking.match && (
          <MatchVisibilityCard
            match={booking.match}
            canToggle={isPlayer && currentUserId === booking.userId && booking.status === 'confirmed'}
            isFlipping={isFlipping}
            onToggle={handleVisibilityToggle}
            onShareLink={handleShareLink}
          />
        )}

        {/* Upcoming: payment, chat, edit */}
        <div className="rounded-2xl border border-dashed border-white/[0.05] px-5 py-4 mb-6">
          <p className="text-[11px] text-[var(--text3)]">
            Coming soon: payment info · messaging · booking edit
          </p>
        </div>

        {/* Manage match (invite players, etc.) */}
        {canManageMatch && (
          <button
            onClick={() => navigate(`/matches/${booking.match.id}`)}
            className="w-full py-3 rounded-2xl border border-[var(--green)]/30 bg-[var(--green)]/10
                       text-[13px] font-bold text-[var(--green)] hover:bg-[var(--green)]/20
                       transition-colors mb-3"
          >
            Manage match · Invite players
          </button>
        )}

        {/* Review action */}
        {canReview && (
          <button
            onClick={() => setShowReview(true)}
            className="w-full py-3 rounded-2xl border border-[var(--green)]/30 bg-[var(--green)]/10
                       text-[13px] font-bold text-[var(--green)] hover:bg-[var(--green)]/20
                       transition-colors mb-3"
          >
            Leave a review
          </button>
        )}
        {isPlayer && booking.hasReviewed && (
          <div className="w-full py-3 rounded-2xl border border-white/[0.07] bg-[var(--surface)]
                          text-[13px] font-bold text-[var(--text2)] text-center mb-3">
            Reviewed ✓
          </div>
        )}

        {/* Cancel action */}
        {canCancel && (
          <button
            onClick={() => setShowDialog(true)}
            className="w-full py-3 rounded-2xl border border-[var(--red)]/30 bg-[var(--red)]/10
                       text-[13px] font-bold text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
          >
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  )
}

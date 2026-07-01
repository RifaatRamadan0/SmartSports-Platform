import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listContainerVariants, listItemVariants } from '../../lib/motion'
import { getMyBookings, cancelBooking } from '../../services/Booking/bookingService'
import StatusBadge from '../../components/ui/StatusBadge'
import Toast from '../../components/ui/Toast'
import { parseApiError } from '../../utils/errorUtils'

import { BOOKINGS_PAGE_SIZE, CANCEL_BUFFER_MS } from '../../constants'

const PAGE_SIZE = BOOKINGS_PAGE_SIZE

const fmtTime = t => t.slice(0, 5)

// Booking is cancellable only if status === 'confirmed' AND start > now + 1h
function isCancellable(booking) {
  if (booking.status !== 'confirmed') return false
  const start = new Date(`${booking.bookingDate}T${booking.startTime}`)
  return start.getTime() > Date.now() + CANCEL_BUFFER_MS
}

// Skeleton

function BookingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-20 rounded-2xl bg-[var(--surface)] border border-white/[0.06]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

// Page 

export default function PlayerBookingsPage() {
  const navigate = useNavigate()

  const [bookings,   setBookings]   = useState([])
  const [pagination, setPagination] = useState(null)
  const [page,       setPage]       = useState(1)
  const [filters,    setFilters]    = useState({ status: '', from: '', to: '' })
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)
  const [toast,      setToast]      = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Fetch bookings 

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getMyBookings({
        status:   filters.status || undefined,
        from:     filters.from   || undefined,
        to:       filters.to     || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setBookings(result.items)
      setPagination({
        totalCount:      result.totalCount,
        totalPages:      result.totalPages,
        hasPreviousPage: result.hasPreviousPage,
        hasNextPage:     result.hasNextPage,
      })
    } catch (err) {
      setError(parseApiError(err, 'Failed to load bookings. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Filter handlers

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({ status: '', from: '', to: '' })
    setPage(1)
  }, [])

  // Cancel handlers

  const handleConfirmCancel = useCallback(async (reason) => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await cancelBooking(cancelTarget.id, reason?.trim() || null)
      setCancelTarget(null)
      setToast({ type: 'success', message: 'Booking cancelled.' })
      await fetchBookings()
    } catch (err) {
      setToast({
        type:    'error',
        message: parseApiError(err, 'Could not cancel booking.'),
      })
    } finally {
      setIsCancelling(false)
    }
  }, [cancelTarget, fetchBookings])

  // Derived

  const hasActiveFilters = filters.status || filters.from || filters.to
  const showingFrom = pagination?.totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const showingTo   = pagination ? Math.min(page * PAGE_SIZE, pagination.totalCount) : 0

  // Render
  
  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-[var(--text)]">

      {/* Page header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--green)]">
            My Account
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Bookings
          </h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            View all your pitch bookings and their current status.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold
                     bg-[var(--surface)] border border-white/[0.07] text-[var(--text2)]
                     hover:text-white hover:border-white/15 transition-colors"
        >
          ← Dashboard
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] border border-white/[0.07]
                     text-white focus:outline-none focus:ring-1 focus:ring-[var(--green)]
                     transition-all duration-200 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          aria-label="From date"
          value={filters.from}
          onChange={e => handleFilterChange('from', e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] border border-white/[0.07]
                     text-white [color-scheme:dark] focus:outline-none focus:ring-1
                     focus:ring-[var(--green)] transition-all duration-200"
        />

        <input
          type="date"
          aria-label="To date"
          value={filters.to}
          onChange={e => handleFilterChange('to', e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] border border-white/[0.07]
                     text-white [color-scheme:dark] focus:outline-none focus:ring-1
                     focus:ring-[var(--green)] transition-all duration-200"
        />

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-[var(--text2)] underline underline-offset-2
                       hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && <BookingSkeleton />}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--red-border)]
                        bg-[var(--bg3)] px-5 py-4 text-sm text-[var(--red)]">
          <span>✕</span>
          <span>{error}</span>
          <button
            onClick={fetchBookings}
            className="ml-auto text-xs underline underline-offset-2 hover:text-[var(--red)] opacity-80 hover:opacity-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && bookings.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl
                     border border-white/[0.06] bg-[var(--surface)] py-16 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <span className="text-3xl floating inline-block">🏟️</span>
          <p className="text-sm font-semibold text-[var(--text2)]">No bookings found</p>
          <p className="text-xs text-[var(--text3)]">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : "You haven't made any bookings yet"}
          </p>
        </motion.div>
      )}

      {/* List + Pagination */}
      {!isLoading && !error && bookings.length > 0 && (
        <>
          <motion.div
            className="flex flex-col gap-3"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {bookings.map(booking => (
              <motion.div
                key={booking.id}
                variants={listItemVariants}
                onClick={() => navigate(`/bookings/${booking.id}`)}
                className="flex items-center justify-between rounded-2xl p-4
                           border border-white/[0.06] bg-[var(--surface)]
                           hover:border-[var(--green-border)] hover:bg-[var(--bg3)]
                           transition-all duration-200 cursor-pointer"
              >
                {/* Left — pitch + datetime */}
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {booking.pitchName}
                  </p>
                  <p className="text-xs text-[var(--text2)]">
                    {booking.bookingDate} · {fmtTime(booking.startTime)} → {fmtTime(booking.endTime)}
                  </p>
                </div>

                {/* Center — price */}
                <p className="text-sm font-bold text-white shrink-0 mx-6">
                  ${Number(booking.totalPrice).toFixed(2)}
                </p>

                {/* Right — status + cancel */}
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={booking.status} />
                  {isCancellable(booking) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCancelTarget(booking) }}
                      className="text-xs font-semibold text-[var(--text2)]
                                 hover:text-[var(--red)] px-2 py-1 rounded-md
                                 border border-transparent hover:border-[var(--red-border)]
                                 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-[var(--text3)]">
                Showing {showingFrom}–{showingTo} of {pagination.totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border
                             border-white/[0.07] text-[var(--text2)] bg-transparent
                             hover:border-[var(--green)] hover:text-white
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  ← Prev
                </button>
                <span className="text-xs text-[var(--text3)]">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border
                             border-white/[0.07] text-[var(--text2)] bg-transparent
                             hover:border-[var(--green)] hover:text-white
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          isSubmitting={isCancelling}
          onConfirm={handleConfirmCancel}
          onClose={() => !isCancelling && setCancelTarget(null)}
        />
      )}

      {/* Toast */}
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

// Cancel dialog

function CancelDialog({ booking, isSubmitting, onConfirm, onClose }) {
  const [reason, setReason] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.07]
                   bg-[var(--surface)] p-6 shadow-2xl"
      >
        <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--red)]">
          Cancel Booking
        </p>
        <h2 className="text-lg font-bold text-white mt-1">
          {booking.pitchName}
        </h2>
        <p className="text-xs text-[var(--text2)] mt-1">
          {booking.bookingDate} · {fmtTime(booking.startTime)} → {fmtTime(booking.endTime)}
        </p>

        <p className="mt-4 text-sm text-[var(--text2)] leading-relaxed">
          Are you sure you want to cancel? This can't be undone.
        </p>

        <label className="block mt-5">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text2)]">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. weather, scheduling change…"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-[var(--bg)] border border-white/[0.07]
                       px-3 py-2 text-sm text-white placeholder:text-[var(--text3)]
                       focus:outline-none focus:ring-1 focus:ring-[var(--red)]
                       disabled:opacity-60"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-xs font-semibold border
                       border-white/[0.07] text-[var(--text2)] hover:text-white hover:border-white/30
                       transition-colors disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-xs font-bold
                       bg-[var(--red)] text-white hover:opacity-90 active:scale-95
                       transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '../../components/routing/PageWrapper'
import { listContainerVariants } from '../../lib/motion'
import { getOwnerBookings, ownerCancelBooking } from '../../services/Booking/bookingService'
import BookingCard from '../../components/ui/BookingCard'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { parseApiError } from '../../utils/errorUtils'

import { BOOKINGS_PAGE_SIZE, CANCEL_BUFFER_MS } from '../../constants'

const PAGE_SIZE = BOOKINGS_PAGE_SIZE

const fmtTime = t => t.slice(0, 5)

function isCancellable(booking) {
  if (booking.status !== 'confirmed') return false
  const start = new Date(`${booking.bookingDate}T${booking.startTime}`)
  return start.getTime() > Date.now() + CANCEL_BUFFER_MS
}


// page

export default function OwnerBookingsPage() {
  const navigate = useNavigate()

  const [bookings,   setBookings]   = useState([])
  const [pagination, setPagination] = useState(null)
  const [page,       setPage]       = useState(1)
  const [filters,    setFilters]    = useState({ status: '', from: '', to: '' })
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)
  const [toast,        setToast]        = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Fetch bookings

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getOwnerBookings({
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

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await ownerCancelBooking(cancelTarget.id, cancelReason?.trim() || null)
      setCancelTarget(null)
      setCancelReason('')
      setToast({ type: 'success', message: 'Booking cancelled.' })
      await fetchBookings()
    } catch (err) {
      setToast({ type: 'error', message: parseApiError(err, 'Could not cancel booking.') })
    } finally {
      setIsCancelling(false)
    }
  }, [cancelTarget, cancelReason, fetchBookings])

  // Derived

  const hasActiveFilters = filters.status || filters.from || filters.to
  const showingFrom = pagination?.totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const showingTo   = pagination ? Math.min(page * PAGE_SIZE, pagination.totalCount) : 0

 //render

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">

      {/* Page header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--green)]">
            Pitch Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bookings
          </h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            All bookings across your pitches, ordered by most recent.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/owner')}
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
      {isLoading && <ListSkeleton />}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--red-border)]
                        bg-[var(--bg3)] px-5 py-4 text-sm text-[var(--red)]">
          <span>✕</span>
          <span>{error}</span>
          <button
            onClick={fetchBookings}
            className="ml-auto text-xs underline underline-offset-2 hover:text-red-300"
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
              : 'No bookings have been made on your pitches yet'}
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
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => navigate(`/bookings/${booking.id}`)}
                onCancel={() => setCancelTarget(booking)}
                isCancelling={isCancelling && cancelTarget?.id === booking.id}
                isCancellable={isCancellable(booking)}
              />
            ))}
          </motion.div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-[var(--text3)]">
                Showing {showingFrom}-{showingTo} of {pagination.totalCount}
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
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel dialog */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel Booking"
        message="Are you sure you want to cancel? This can't be undone."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelTarget(null)
          setCancelReason('')
        }}
        isSubmitting={isCancelling}
        variant="danger"
      >
        {cancelTarget && (
          <>
            <div className="rounded-lg border border-white/[0.06] bg-[var(--bg)] p-3 mb-4">
              <p className="text-sm font-semibold text-white">{cancelTarget.pitchName}</p>
              <p className="text-xs text-[var(--text2)] mt-0.5">
                {cancelTarget.bookingDate} · {fmtTime(cancelTarget.startTime)} - {fmtTime(cancelTarget.endTime)}
              </p>
            </div>
            <label className="block">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text2)]">
                Reason (optional)
              </span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. weather, scheduling change…"
                disabled={isCancelling}
                className="mt-2 w-full rounded-xl bg-[var(--bg)] border border-white/[0.07]
                           px-3 py-2 text-sm text-white placeholder:text-[var(--text3)]
                           focus:outline-none focus:ring-1 focus:ring-[var(--red)]
                           disabled:opacity-60"
              />
            </label>
          </>
        )}
      </ConfirmDialog>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageWrapper>
  )
}


import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listContainerVariants, listItemVariants } from '../../lib/motion'
import { getOwnerBookings } from '../../services/Booking/bookingService'
import StatusBadge from '../../components/ui/StatusBadge'
import Toast from '../../components/ui/Toast'
import { parseApiError } from '../../utils/errorUtils'

import { BOOKINGS_PAGE_SIZE } from '../../constants'

const PAGE_SIZE = BOOKINGS_PAGE_SIZE

const fmtTime = t => t.slice(0, 5)

// Skeleton

function BookingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-20 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
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
  // TODO: wire up when cancel booking is implemented (SPDBTCP-168)
  const [toast,      setToast]      = useState(null)

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

  // Derived

  const hasActiveFilters = filters.status || filters.from || filters.to
  const showingFrom = pagination?.totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const showingTo   = pagination ? Math.min(page * PAGE_SIZE, pagination.totalCount) : 0

 //render

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">

      {/* Page header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">
            Pitch Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bookings
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            All bookings across your pitches, ordered by most recent.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/owner')}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold
                     bg-[#0d0d0d] border border-[#1f1f1f] text-neutral-300
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
          className="rounded-xl px-4 py-2.5 text-sm bg-[#0d0d0d] border border-[#1f1f1f]
                     text-white focus:outline-none focus:ring-1 focus:ring-green-500
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
          className="rounded-xl px-4 py-2.5 text-sm bg-[#0d0d0d] border border-[#1f1f1f]
                     text-white [color-scheme:dark] focus:outline-none focus:ring-1
                     focus:ring-green-500 transition-all duration-200"
        />

        <input
          type="date"
          aria-label="To date"
          value={filters.to}
          onChange={e => handleFilterChange('to', e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm bg-[#0d0d0d] border border-[#1f1f1f]
                     text-white [color-scheme:dark] focus:outline-none focus:ring-1
                     focus:ring-green-500 transition-all duration-200"
        />

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-neutral-500 underline underline-offset-2
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
        <div className="flex items-center gap-3 rounded-xl border border-red-800
                        bg-[#1a0f0f] px-5 py-4 text-sm text-red-400">
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
                     border border-[#1a1a1a] bg-[#0d0d0d] py-16 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <span className="text-3xl floating inline-block">🏟️</span>
          <p className="text-sm font-semibold text-neutral-500">No bookings found</p>
          <p className="text-xs text-neutral-700">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'No bookings have been made on your pitches yet'}
          </p>
        </motion.div>
      )}

      {/* List + Pagination */}
      {!isLoading && !error && bookings.length > 0 && (
        <>
          {/* TODO: /bookings/:id route and detail page — SPDBTCP-223 */}
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
                           border border-[#1a1a1a] bg-[#0d0d0d]
                           hover:border-[#2a4a30] hover:bg-[#0f1a12]
                           transition-all duration-200 cursor-pointer"
              >
                {/* Left — pitch + datetime */}
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {booking.pitchName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {booking.bookingDate} · {fmtTime(booking.startTime)} → {fmtTime(booking.endTime)}
                  </p>
                </div>

                {/* Center — price */}
                <p className="text-sm font-bold text-white shrink-0 mx-6">
                  ${Number(booking.totalPrice).toFixed(2)}
                </p>

                {/* Right — status */}
                <StatusBadge status={booking.status} />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-neutral-600">
                Showing {showingFrom}–{showingTo} of {pagination.totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border
                             border-[#1f1f1f] text-neutral-400 bg-transparent
                             hover:border-green-600 hover:text-white
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  ← Prev
                </button>
                <span className="text-xs text-neutral-600">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border
                             border-[#1f1f1f] text-neutral-400 bg-transparent
                             hover:border-green-600 hover:text-white
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
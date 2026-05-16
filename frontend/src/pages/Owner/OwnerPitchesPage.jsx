import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '../../lib/motion'
import { listMyPitches, deletePitch } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'

// Toast

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
        rounded-xl shadow-2xl border text-sm font-medium
        ${type === 'success'
          ? 'bg-[#0f1a12] border-green-600 text-green-400'
          : 'bg-[#1a0f0f] border-red-600 text-red-400'
        }
      `}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}

// Skeleton

function PitchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-32 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

// 0 = PendingApproval, 1 = Approved, 2 = Rejected
const PITCH_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2 }

// Status pill

function StatusPill({ isActive, status }) {
  if (status === PITCH_STATUS.REJECTED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                       bg-red-500/10 text-red-400 border border-red-500/30">
        Rejected
      </span>
    )
  }
  if (status === PITCH_STATUS.PENDING) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                       bg-amber-500/10 text-amber-400 border border-amber-500/30">
        Pending Approval
      </span>
    )
  }
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                       bg-neutral-800 text-neutral-400 border border-neutral-700">
        Inactive
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                     bg-green-500/10 text-green-400 border border-green-500/30">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Active
    </span>
  )
}

// Card

function PitchCard({ pitch, onNavigate, onDelete, isDeleting }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <motion.div
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="flex overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d]
                    hover:border-white/10 transition-colors">
      <div className="hidden sm:block w-[130px] h-full shrink-0 bg-[#0a0a0a]">
        <PitchCover imageUrl={pitch.coverImageUrl} sport={pitch.sportName} imageCount={pitch.imageCount} className="w-full h-full" />
      </div>

      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-white truncate">{pitch.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {pitch.sportName} · {pitch.address}
            </p>
          </div>
          <div className="font-bold text-green-400 whitespace-nowrap">
            ${pitch.pricePerHour}
            <span className="text-xs text-neutral-500 font-normal">/hr</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <StatusPill isActive={pitch.isActive} status={pitch.status} />
          {pitch.status === PITCH_STATUS.REJECTED && pitch.rejectionReason && (
            <span className="text-[11px] text-red-400/80 italic truncate max-w-xs">
              "{pitch.rejectionReason}"
            </span>
          )}
          {pitch.rating != null && (
            <span className="text-xs text-neutral-400">⭐ {pitch.rating}</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate(`/dashboard/pitches/${pitch.id}/schedule`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-neutral-300
                       hover:text-white hover:border-white/15 transition-colors"
          >
            Edit Schedule
          </button>
          <button
            onClick={() => onNavigate(`/dashboard/pitches/${pitch.id}/edit`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-neutral-300
                       hover:text-white hover:border-white/15 transition-colors"
          >
            Edit Details
          </button>

          {confirming ? (
            <>
              <button
                onClick={() => { setConfirming(false); onDelete(pitch.id) }}
                disabled={isDeleting}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold
                           bg-red-500/15 border border-red-500/40 text-red-400
                           hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={isDeleting}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold
                           bg-[#141414] border border-[#1f1f1f] text-neutral-400
                           hover:text-white hover:border-white/15 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold
                         bg-[#141414] border border-red-900/40 text-red-500
                         hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Page

export default function OwnerPitchesPage() {
  const navigate = useNavigate()

  const [pitches,    setPitches]   = useState([])
  const [isLoading,  setIsLoading] = useState(true)
  const [error,      setError]     = useState(null)
  const [filter,     setFilter]    = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [toast,      setToast]     = useState(null)

  const closeToast = useCallback(() => setToast(null), [])

  const fetchPitches = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listMyPitches()
      setPitches(data ?? [])
    } catch (err) {
      setError(parseApiError(err, 'Failed to load your pitches. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPitches() }, [fetchPitches])

  const handleDelete = useCallback(async (id) => {
    setDeletingId(id)
    try {
      await deletePitch(id)
      setPitches(prev => prev.filter(p => p.id !== id))
      setToast({ message: 'Pitch deleted successfully.', type: 'success' })
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to delete pitch. Please try again.'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }, [])

  const counts = {
    all:      pitches.length,
    active:   pitches.filter(p => p.status === PITCH_STATUS.APPROVED && p.isActive).length,
    inactive: pitches.filter(p => p.status === PITCH_STATUS.APPROVED && !p.isActive).length,
    pending:  pitches.filter(p => p.status === PITCH_STATUS.PENDING).length,
    rejected: pitches.filter(p => p.status === PITCH_STATUS.REJECTED).length,
  }

  const visiblePitches = pitches.filter(p => {
    if (filter === 'active')   return p.status === PITCH_STATUS.APPROVED && p.isActive
    if (filter === 'inactive') return p.status === PITCH_STATUS.APPROVED && !p.isActive
    if (filter === 'pending')  return p.status === PITCH_STATUS.PENDING
    if (filter === 'rejected') return p.status === PITCH_STATUS.REJECTED
    return true
  })

  const filterTabs = [
    { id: 'all',      label: 'All',              count: counts.all      },
    { id: 'active',   label: 'Active',           count: counts.active   },
    { id: 'inactive', label: 'Inactive',         count: counts.inactive },
    { id: 'pending',  label: 'Pending Approval', count: counts.pending  },
    { id: 'rejected', label: 'Rejected',         count: counts.rejected },
  ]

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">

      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">
            Pitch Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight">My Pitches</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Every pitch you own — including listings still pending admin approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/owner')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-[#0d0d0d] border border-[#1f1f1f] text-neutral-300
                       hover:text-white hover:border-white/15 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-[#0d0d0d] border border-[#1f1f1f] text-neutral-300
                       hover:text-white hover:border-white/15 transition-colors"
          >
            View Bookings
          </button>
          <button
            onClick={() => navigate('/dashboard/pitches/new')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-green-500 text-black hover:bg-green-400 transition-colors"
          >
            + Add Pitch
          </button>
        </div>
      </div>

      {/* Filter pills */}
      {!isLoading && !error && pitches.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filterTabs.map(t => {
            const isActive = filter === t.id
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={
                  'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ' +
                  (isActive
                    ? 'bg-green-500/15 border border-green-500/40 text-green-300'
                    : 'bg-[#0d0d0d] border border-[#1f1f1f] text-neutral-400 hover:text-white hover:border-white/15')
                }
              >
                {t.label}
                <span
                  className={
                    'inline-flex items-center justify-center min-w-5 h-5 rounded-full px-1.5 text-[11px] font-bold ' +
                    (isActive
                      ? 'bg-green-500/25 text-green-200'
                      : 'bg-[#1a1a1a] text-neutral-400')
                  }
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Body */}
      {isLoading && <PitchCardSkeleton />}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={fetchPitches}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-white
                       hover:border-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && pitches.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-10 text-center">
          <p className="text-base font-semibold text-white">No pitches yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Add your first pitch to start receiving bookings.
          </p>
          <button
            onClick={() => navigate('/dashboard/pitches/new')}
            className="mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-green-500 text-black hover:bg-green-400 transition-colors"
          >
            + Add Pitch
          </button>
        </div>
      )}

      {!isLoading && !error && pitches.length > 0 && visiblePitches.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-8 text-center">
          <p className="text-sm text-neutral-400">
            No pitches match this filter.
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[#141414] border border-[#1f1f1f] text-neutral-300
                       hover:text-white hover:border-white/15 transition-colors"
          >
            Show all
          </button>
        </div>
      )}

      {!isLoading && !error && visiblePitches.length > 0 && (
        <motion.div
          className="flex flex-col gap-3"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {visiblePitches.map(p => (
            <PitchCard
              key={p.id}
              pitch={p}
              onNavigate={navigate}
              onDelete={handleDelete}
              isDeleting={deletingId === p.id}
            />
          ))}
        </motion.div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}

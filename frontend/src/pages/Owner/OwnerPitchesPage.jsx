import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '../../lib/motion'
import { listMyPitches, deletePitch } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'
import Toast from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { ListSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'


// 0 = PendingApproval, 1 = Approved, 2 = Rejected
const PITCH_STATUS = { PENDING: 0, APPROVED: 1, REJECTED: 2 }

// Status pill

function StatusPill({ isActive, status }) {
  if (status === PITCH_STATUS.REJECTED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                       bg-[var(--red)]/10 text-[var(--red)] border border-red-500/30">
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
                       bg-neutral-800 text-[var(--text2)] border border-neutral-700">
        Inactive
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                     bg-[var(--green-muted)] text-[var(--green)] border border-[var(--green-border)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
      Active
    </span>
  )
}

// Card

function PitchCard({ pitch, onNavigate, isDeleting, onDeleteRequest }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="flex overflow-hidden rounded-2xl border border-white/[0.07] bg-[var(--surface)]
                    hover:border-white/10 transition-colors">
      <div className="hidden sm:block w-[130px] h-full shrink-0 bg-[var(--bg2)]">
        <PitchCover imageUrl={pitch.coverImageUrl} sport={pitch.sportName} imageCount={pitch.imageCount} className="w-full h-full" />
      </div>

      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-white truncate">{pitch.name}</h3>
            <p className="text-xs text-[var(--text2)] mt-0.5 truncate">
              {pitch.sportName} · {pitch.address}
            </p>
          </div>
          <div className="font-bold text-[var(--green)] whitespace-nowrap">
            ${pitch.pricePerHour}
            <span className="text-xs text-[var(--text2)] font-normal">/hr</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <StatusPill isActive={pitch.isActive} status={pitch.status} />
          {pitch.status === PITCH_STATUS.REJECTED && pitch.rejectionReason && (
            <span className="text-[11px] text-[var(--red)]/80 italic truncate max-w-xs">
              "{pitch.rejectionReason}"
            </span>
          )}
          {pitch.rating != null && (
            <span className="text-xs text-[var(--text2)]">⭐ {pitch.rating}</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate(`/dashboard/pitches/${pitch.id}/schedule`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[var(--bg3)] border border-white/[0.07] text-[var(--text2)]
                       hover:text-white hover:border-white/15 transition-colors"
          >
            Edit Schedule
          </button>
          <button
            onClick={() => onNavigate(`/dashboard/pitches/${pitch.id}/edit`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[var(--bg3)] border border-white/[0.07] text-[var(--text2)]
                       hover:text-white hover:border-white/15 transition-colors"
          >
            Edit Details
          </button>
          <button
            onClick={() => onDeleteRequest(pitch)}
            disabled={isDeleting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[var(--bg3)] border border-red-900/40 text-[var(--red)]
                       hover:bg-[var(--red)]/10 hover:border-red-500/40
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Page

export default function OwnerPitchesPage() {
  const navigate = useNavigate()

  const [pitches,      setPitches]     = useState([])
  const [isLoading,    setIsLoading]   = useState(true)
  const [error,        setError]       = useState(null)
  const [filter,       setFilter]      = useState('all')
  const [deletingId,   setDeletingId]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast,        setToast]       = useState(null)

  const closeToast = useCallback(() => setToast(null), [])

  const fetchPitches = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listMyPitches()
      setPitches(data?.items ?? [])
    } catch (err) {
      setError(parseApiError(err, 'Failed to load your pitches. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPitches() }, [fetchPitches])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeletingId(id)
    try {
      await deletePitch(id)
      setDeleteTarget(null)
      setPitches(prev => prev.filter(p => p.id !== id))
      setToast({ message: 'Pitch deleted successfully.', type: 'success' })
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to delete pitch. Please try again.'), type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }, [deleteTarget])

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
    <div className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">

      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--green)]">
            Pitch Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight">My Pitches</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            Every pitch you own — including listings still pending admin approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/owner')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-[var(--surface)] border border-white/[0.07] text-[var(--text2)]
                       hover:text-white hover:border-white/15 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-[var(--surface)] border border-white/[0.07] text-[var(--text2)]
                       hover:text-white hover:border-white/15 transition-colors"
          >
            View Bookings
          </button>
          <button
            onClick={() => navigate('/dashboard/pitches/new')}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold
                       bg-[var(--green)] text-black hover:bg-[var(--green)] transition-colors"
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
                    ? 'bg-[var(--green)]/15 border border-[var(--green-border)] text-[var(--green)]'
                    : 'bg-[var(--surface)] border border-white/[0.07] text-[var(--text2)] hover:text-white hover:border-white/15')
                }
              >
                {t.label}
                <span
                  className={
                    'inline-flex items-center justify-center min-w-5 h-5 rounded-full px-1.5 text-[11px] font-bold ' +
                    (isActive
                      ? 'bg-[var(--green)]/25 text-[var(--green)]'
                      : 'bg-[var(--bg3)] text-[var(--text2)]')
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
      {isLoading && <ListSkeleton count={3} height="h-32" />}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-[var(--red)]/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={fetchPitches}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold
                       bg-[var(--bg3)] border border-white/[0.07] text-white
                       hover:border-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && pitches.length === 0 && (
        <EmptyState
          icon="🏟️"
          title="No pitches yet"
          message="Add your first pitch to start receiving bookings."
          action={
            <button
              onClick={() => navigate('/dashboard/pitches/new')}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold
                         bg-[var(--green)] text-black hover:brightness-110 transition-all"
            >
              + Add Pitch
            </button>
          }
        />
      )}

      {!isLoading && !error && pitches.length > 0 && visiblePitches.length === 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm text-[var(--text2)]">
            No pitches match this filter.
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-[var(--bg3)] border border-white/[0.07] text-[var(--text2)]
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
              isDeleting={deletingId === p.id}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Pitch"
        message="This pitch will be permanently removed from public listings. This action cannot be undone. Any confirmed bookings will remain visible to the players who made them — they will not be automatically cancelled."
        confirmLabel="Delete pitch"
        cancelLabel="Keep pitch"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isSubmitting={!!deletingId}
        variant="danger"
      >
        {deleteTarget && (
          <div className="rounded-lg border border-white/[0.06] bg-[var(--bg)] p-3">
            <p className="text-sm font-semibold text-white">{deleteTarget.name}</p>
            <p className="text-xs text-[var(--text2)] mt-0.5">{deleteTarget.address}</p>
          </div>
        )}
      </ConfirmDialog>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}



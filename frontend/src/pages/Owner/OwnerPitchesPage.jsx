import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyPitches } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'

// Skeleton

function PitchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse"
        />
      ))}
    </div>
  )
}

// Status pill

function StatusPill({ isActive, isApproved }) {
  if (!isApproved) {
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

function PitchCard({ pitch, onNavigate }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d]
                    hover:border-white/10 transition-colors">
      <div className="hidden sm:flex w-[130px] flex-shrink-0 items-center justify-center bg-[#0a0a0a]">
        <svg viewBox="0 0 200 130" fill="none" width="100" height="65" className="opacity-30">
          <rect x="2" y="2" width="196" height="126" rx="3" stroke="#4ade80" strokeWidth="2" />
          <line x1="100" y1="2" x2="100" y2="128" stroke="#4ade80" strokeWidth="1.2" />
          <circle cx="100" cy="65" r="20" stroke="#4ade80" strokeWidth="1.2" />
          <circle cx="100" cy="65" r="3" fill="#4ade80" />
          <rect x="2" y="38" width="28" height="54" stroke="#4ade80" strokeWidth="1.2" />
          <rect x="170" y="38" width="28" height="54" stroke="#4ade80" strokeWidth="1.2" />
        </svg>
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
            £{pitch.pricePerHour}
            <span className="text-xs text-neutral-500 font-normal">/hr</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <StatusPill isActive={pitch.isActive} isApproved={pitch.isApproved} />
          {pitch.rating != null && (
            <span className="text-xs text-neutral-400">⭐ {pitch.rating}</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('/dashboard/bookings')}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold
                       bg-green-500/10 border border-green-500/30 text-green-400
                       hover:bg-green-500/20 transition-colors"
          >
            View Bookings
          </button>
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
        </div>
      </div>
    </div>
  )
}

// Page

export default function OwnerPitchesPage() {
  const navigate = useNavigate()

  const [pitches,   setPitches]   = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [filter,    setFilter]    = useState('all')

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

  const counts = {
    all:      pitches.length,
    active:   pitches.filter(p => p.isApproved && p.isActive).length,
    inactive: pitches.filter(p => p.isApproved && !p.isActive).length,
    pending:  pitches.filter(p => !p.isApproved).length,
  }

  const visiblePitches = pitches.filter(p => {
    if (filter === 'active')   return p.isApproved && p.isActive
    if (filter === 'inactive') return p.isApproved && !p.isActive
    if (filter === 'pending')  return !p.isApproved
    return true
  })

  const filterTabs = [
    { id: 'all',      label: 'All',              count: counts.all      },
    { id: 'active',   label: 'Active',           count: counts.active   },
    { id: 'inactive', label: 'Inactive',         count: counts.inactive },
    { id: 'pending',  label: 'Pending Approval', count: counts.pending  },
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
        <button
          onClick={() => navigate('/dashboard/pitches/new')}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold
                     bg-green-500 text-black hover:bg-green-400 transition-colors"
        >
          + Add Pitch
        </button>
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
                    'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[11px] font-bold ' +
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
        <div className="flex flex-col gap-3">
          {visiblePitches.map(p => (
            <PitchCard key={p.id} pitch={p} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMyPitches } from '../../services/Pitch/pitchService'
import { getOwnerBookings } from '../../services/Booking/bookingService'
import StatusBadge from '../../components/ui/StatusBadge'
import { parseApiError } from '../../utils/errorUtils'

const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtTime = t => t?.slice(0, 5) ?? ''

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'green' }) {
  const accent = {
    green:  'text-[var(--green)]',
    amber:  'text-amber-400',
    red:    'text-red-400',
    muted:  'text-[var(--text2)]',
  }[color]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5 flex flex-col gap-1">
      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-[var(--text3)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Quick action card ─────────────────────────────────────────────────────────

function ActionCard({ label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5 text-left
                 hover:border-[var(--green-border)] hover:bg-[var(--bg3)] transition-all group"
    >
      <p className="text-[14px] font-bold text-white group-hover:text-[var(--green)] transition-colors">{label} →</p>
      <p className="text-[12px] text-[var(--text2)] mt-1">{desc}</p>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OwnerDashboardPage() {
  const navigate = useNavigate()

  const [pitches,         setPitches]         = useState([])
  const [recentBookings,  setRecentBookings]  = useState([])
  const [isLoadingPitches,  setIsLoadingPitches]  = useState(true)
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [pitchError,    setPitchError]    = useState(null)
  const [bookingError,  setBookingError]  = useState(null)

  const fetchPitches = useCallback(async () => {
    setIsLoadingPitches(true)
    setPitchError(null)
    try {
      const data = await listMyPitches()
      setPitches(data?.items ?? [])
    } catch (err) {
      setPitchError(parseApiError(err, 'Could not load pitches.'))
    } finally {
      setIsLoadingPitches(false)
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    setIsLoadingBookings(true)
    setBookingError(null)
    try {
      const data = await getOwnerBookings({ pageSize: 5 })
      setRecentBookings(data.items ?? [])
    } catch (err) {
      setBookingError(parseApiError(err, 'Could not load bookings.'))
    } finally {
      setIsLoadingBookings(false)
    }
  }, [])

  useEffect(() => {
    fetchPitches()
    fetchBookings()
  }, [fetchPitches, fetchBookings])

  // Derived pitch stats — status: 0=PendingApproval, 1=Approved, 2=Rejected
  const activePitches   = pitches.filter(p => p.status === 1 && p.isActive)
  const pendingPitches  = pitches.filter(p => p.status === 0)
  const rejectedPitches = pitches.filter(p => p.status === 2)

  // Derived booking stats
  const confirmedCount = recentBookings.filter(b => b.status === 'confirmed').length
  const pendingCount   = recentBookings.filter(b => b.status === 'pending').length

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = recentBookings.filter(b => b.bookingDate === today).length

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">

      <main className="mx-auto max-w-[1280px] px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-1">
            Owner Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-sm text-[var(--text2)] mt-1">Here's an overview of your pitches and bookings.</p>
        </div>

        {/* Pitch stats */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-3">Pitches</h2>
          {isLoadingPitches ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-[var(--surface)] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : pitchError ? (
            <p className="text-sm text-red-400">{pitchError}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Pitches"   value={pitches.length}         color="muted" />
              <StatCard label="Active"          value={activePitches.length}   color="green" />
              <StatCard label="Pending Approval" value={pendingPitches.length}  color="amber" />
              <StatCard label="Rejected"        value={rejectedPitches.length} color="red"   />
            </div>
          )}
        </section>

        {/* Booking stats */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-3">Recent Bookings</h2>
          {isLoadingBookings ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-[var(--surface)] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : bookingError ? (
            <p className="text-sm text-red-400 mb-4">{bookingError}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                <StatCard label="Today's Bookings" value={todayCount}      color="green" />
                <StatCard label="Confirmed"        value={confirmedCount}  color="green" />
                <StatCard label="Pending"          value={pendingCount}    color="amber" />
              </div>

              {recentBookings.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] py-10 text-center">
                  <p className="text-sm text-[var(--text2)]">No bookings yet.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[12px] font-bold text-white">Latest bookings</p>
                    <button
                      onClick={() => navigate('/dashboard/bookings')}
                      className="text-[11px] text-[var(--green)] hover:underline"
                    >
                      View all →
                    </button>
                  </div>
                  <ul>
                    {recentBookings.map((b, i) => (
                      <li
                        key={b.id}
                        className={`flex items-center justify-between px-5 py-3.5 gap-4
                          ${i < recentBookings.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate">{b.pitchName ?? 'Pitch'}</p>
                          <p className="text-[11px] text-[var(--text2)] mt-0.5">
                            {fmtDate(b.bookingDate)} · {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionCard
              label="Manage Pitches"
              desc="View, edit, or remove your listed pitches."
              onClick={() => navigate('/dashboard/pitches')}
            />
            <ActionCard
              label="View Bookings"
              desc="Browse all bookings across your pitches."
              onClick={() => navigate('/dashboard/bookings')}
            />
            <ActionCard
              label="Add New Pitch"
              desc="List a new facility and start accepting bookings."
              onClick={() => navigate('/dashboard/pitches/new')}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

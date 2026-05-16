import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getRoleHomePath } from '../../utils/roleUtils'
import { requestPitchOwnerRole, addPlayerRoleInstantly, getMyRoleRequests } from '../../services/Settings/settingsService'
import { parseApiError } from '../../utils/errorUtils'
import { refreshSession } from '../../services/api'

// ── Status badge for role requests ───────────────────────────────────────────

function RequestStatusBadge({ status }) {
  // status: 0=Pending, 1=Approved, 2=Rejected
  const map = {
    0: { label: 'Pending',  cls: 'bg-[#1a140a] border-amber-600/50 text-amber-400' },
    1: { label: 'Approved', cls: 'bg-[#0f1a12] border-green-600/50 text-green-400' },
    2: { label: 'Rejected', cls: 'bg-[#1a0f0f] border-red-600/50 text-red-400'    },
  }
  const { label, cls } = map[status] ?? map[0]
  return (
    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase ${cls}`}>
      {label}
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const map = {
    Player:     'bg-blue-500/10 border-blue-500/30 text-blue-400',
    PitchOwner: 'bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]',
    Admin:      'bg-purple-500/10 border-purple-500/30 text-purple-400',
  }
  return (
    <span className={`px-3 py-1.5 rounded-full border text-[12px] font-bold ${map[role] ?? ''}`}>
      {role === 'PitchOwner' ? 'Pitch Owner' : role}
    </span>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const navigate = useNavigate()
  const { roles, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(getRoleHomePath(roles))}
          className="flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(getRoleHomePath(roles))}
            className="text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
          >
            ← Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="text-[12px] font-semibold text-[var(--text2)] hover:text-red-400 px-3 py-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate()
  const { roles, login } = useAuth()

  const isPlayer     = roles.includes(ROLES.PLAYER)
  const isOwner      = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin      = roles.includes(ROLES.ADMIN)

  const [requests,      setRequests]      = useState([])
  const [isLoadingReqs, setIsLoadingReqs] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast,         setToast]         = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchRequests = useCallback(async () => {
    setIsLoadingReqs(true)
    try {
      const data = await getMyRoleRequests()
      setRequests(data ?? [])
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load role requests:', err)
      setToast({ message: 'Could not load your role requests.', type: 'error' })
    } finally {
      setIsLoadingReqs(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const hasPendingOwnerRequest = requests.some(
    r => r.requestedRole === 'PitchOwner' && r.status === 0
  )

  const handleRequestOwner = async () => {
    setActionLoading(true)
    try {
      await requestPitchOwnerRole()
      showToast('Your request has been submitted. An admin will review it shortly.')
      await fetchRequests()
    } catch (err) {
      showToast(parseApiError(err, 'Could not submit request.'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddPlayer = async () => {
    setActionLoading(true)
    try {
      await addPlayerRoleInstantly()
      // Backend mutates user_roles but our current JWT still lacks the Player
      // claim — force a refresh so the new claim is reflected in-place. Use
      // the shared refreshSession() singleton so it coalesces with any other
      // in-flight refresh (StrictMode mount, 401 interceptor).
      const { data } = await refreshSession()
      login(data)
      navigate('/dashboard')
    } catch (err) {
      showToast(parseApiError(err, 'Could not add Player role.'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
          rounded-xl shadow-2xl border text-sm font-medium
          ${toast.type === 'success'
            ? 'bg-[#0f1a12] border-green-600 text-green-400'
            : 'bg-[#1a0f0f] border-red-600 text-red-400'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <main className="mx-auto max-w-[720px] px-6 py-10">
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-1">Account</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        </div>

        {/* Current Roles */}
        <section className="mb-8 rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-6">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-4">Your Roles</h2>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => <RoleBadge key={r} role={r} />)}
          </div>
          <p className="text-[12px] text-[var(--text3)] mt-3">
            Each role gives you access to different parts of the platform.
          </p>
        </section>

        {/* Add Role */}
        {!isAdmin && (
          <section className="mb-8 rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-6">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-4">Expand Access</h2>

            {/* Player wants to become PitchOwner */}
            {isPlayer && !isOwner && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">Apply to become a Pitch Owner</p>
                  <p className="text-[12px] text-[var(--text2)] mt-1">
                    List your facilities and manage bookings. Requires admin approval.
                  </p>
                </div>
                {hasPendingOwnerRequest ? (
                  <span className="shrink-0 px-4 py-2 rounded-full text-[12px] font-bold
                                   bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Pending review
                  </span>
                ) : (
                  <button
                    onClick={handleRequestOwner}
                    disabled={actionLoading}
                    className="shrink-0 px-4 py-2 rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                               text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting…' : 'Apply Now'}
                  </button>
                )}
              </div>
            )}

            {/* PitchOwner wants to add Player */}
            {isOwner && !isPlayer && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">Add Player access</p>
                  <p className="text-[12px] text-[var(--text2)] mt-1">
                    Browse and book pitches as a player. Instant, no approval needed.
                  </p>
                </div>
                <button
                  onClick={handleAddPlayer}
                  disabled={actionLoading}
                  className="shrink-0 px-4 py-2 rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                             text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Adding…' : 'Add Player Role'}
                </button>
              </div>
            )}

            {/* Already has both */}
            {isPlayer && isOwner && (
              <p className="text-[13px] text-[var(--text2)]">
                You have full access — both Player and Pitch Owner roles are active.
              </p>
            )}
          </section>
        )}

        {/* Request History */}
        {!isAdmin && (
          <section className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)]">Request History</h2>
            </div>

            {isLoadingReqs ? (
              <div className="px-6 py-6 flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-[var(--bg3)] animate-pulse" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <p className="px-6 py-6 text-[13px] text-[var(--text2)]">No role requests yet.</p>
            ) : (
              <ul>
                {requests.map((r, i) => (
                  <li
                    key={r.id}
                    className={`flex items-center justify-between px-6 py-4 gap-4
                      ${i < requests.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">
                        {r.requestedRole === 'PitchOwner' ? 'Pitch Owner' : r.requestedRole} role request
                      </p>
                      <p className="text-[11px] text-[var(--text3)] mt-0.5">{fmtDate(r.createdAt)}</p>
                      {r.status === 2 && r.rejectionReason && (
                        <p className="text-[11px] text-red-400 mt-1">Reason: {r.rejectionReason}</p>
                      )}
                    </div>
                    <RequestStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

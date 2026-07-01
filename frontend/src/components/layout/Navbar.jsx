import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useActiveMode } from '../../hooks/useActiveMode'
import { ROLES } from '../../constants/roles'
import { MODES } from '../../constants/mode'
import { getRoleHomePath } from '../../utils/roleUtils'
import {
  getMyPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from '../../services/Invitation/invitationService'
import { getPendingJoinRequests, respondToJoinRequest } from '../../services/Match/matchService'

// ── Shared navbar for every authenticated route (and public browse pages). ──────
// Replaces the six hand-rolled navbars. Mode switch (Player ⇄ Owner) is shown
// only to users holding both roles and drives nav items + logo destination.

// ── Small helpers (ported from the old HomePage inbox) ──────────────────────────

function initials2(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase()
}

function timeUntil(dateStr) {
  if (!dateStr) return null
  const ms = new Date(dateStr) - Date.now()
  if (ms <= 0) return null
  const h = Math.floor(ms / 3_600_000)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(timeStr) {
  const [h, m] = timeStr.split(':')
  const d = new Date(); d.setHours(+h, +m)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function matchFmt(maxPlayers) {
  const half = Math.floor(maxPlayers / 2)
  return `${half}v${half}`
}

// ── Inbox cards ─────────────────────────────────────────────────────────────────

function StatCell({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-[var(--bg3)] border border-white/[0.05] px-3 py-2">
      <p className="text-[9px] font-bold tracking-[1.5px] uppercase text-[var(--text3)] mb-0.5">{label}</p>
      <p className={`font-display text-[14px] font-bold ${accent ? 'text-[var(--green)]' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function InvitationCard({ inv, onAccept, onDecline, busy }) {
  const expiry = timeUntil(inv.expiresAt)
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] overflow-hidden">
      <div className="border-l-[3px] border-[var(--green)] p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[var(--green)] text-[#061008] font-display text-[12px] font-bold flex items-center justify-center shrink-0">
              {initials2(inv.inviterDisplayName)}
            </span>
            <div>
              <p className="text-[10px] text-[var(--text3)] leading-none">Invited by</p>
              <p className="text-[13px] font-semibold text-white leading-tight mt-1">@{inv.inviterDisplayName}</p>
            </div>
          </div>
          {expiry && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[oklch(0.72_0.18_55/0.18)] border border-[oklch(0.72_0.18_55/0.32)] text-[oklch(0.82_0.14_65)] text-[11px] font-bold shrink-0">
              ⚡ {expiry}
            </span>
          )}
        </div>
        <p className="font-display text-[18px] font-bold text-white leading-tight mb-1">{inv.pitchName}</p>
        <p className="text-[12px] text-[var(--text2)] mb-4">
          📅 {fmtDate(inv.bookingDate)} · {fmtTime(inv.startTime)} · {inv.sportName} · {matchFmt(inv.maxPlayers)}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCell label="Per Player" value={`$${Number(inv.pricePerPlayer).toFixed(0)}`} accent />
          <StatCell label="Spots Left" value={inv.spotsLeft} />
          <StatCell label="Format"     value={matchFmt(inv.maxPlayers)} />
          <StatCell label="Sport"      value={inv.sportName} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(inv)} disabled={busy}
            className="flex-1 py-2.5 rounded-xl font-display text-[13px] font-bold bg-[var(--green)] text-[#061008] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Accept &amp; Join
          </button>
          <button
            onClick={() => onDecline(inv)} disabled={busy}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[oklch(0.62_0.2_25/0.12)] border border-[oklch(0.62_0.2_25/0.30)] text-[oklch(0.62_0.2_25)] hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

function JoinRequestCard({ req, onAccept, onReject, busy }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] overflow-hidden">
      <div className="border-l-[3px] border-[oklch(0.72_0.10_240)] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-full bg-[oklch(0.6_0.12_240/0.16)] border border-[oklch(0.6_0.12_240/0.30)] text-[oklch(0.72_0.10_240)] font-display text-[12px] font-bold flex items-center justify-center shrink-0">
            {initials2(req.requesterName)}
          </span>
          <div>
            <p className="text-[10px] text-[var(--text3)] leading-none">Join request from</p>
            <p className="text-[13px] font-semibold text-white leading-tight mt-1">@{req.requesterName}</p>
          </div>
        </div>
        <p className="font-display text-[18px] font-bold text-white leading-tight mb-1">{req.pitchName}</p>
        <p className="text-[12px] text-[var(--text2)] mb-4">
          📅 {fmtDate(req.bookingDate)} · {fmtTime(req.startTime)} · {req.sportName} · {matchFmt(req.maxPlayers)}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCell label="Per Player" value={`$${Number(req.pricePerPlayer).toFixed(0)}`} accent />
          <StatCell label="Spots Left" value={req.spotsLeft} />
          <StatCell label="Format"     value={matchFmt(req.maxPlayers)} />
          <StatCell label="Sport"      value={req.sportName} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(req)} disabled={busy}
            className="flex-1 py-2.5 rounded-xl font-display text-[13px] font-bold bg-[var(--green)] text-[#061008] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(req)} disabled={busy}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[oklch(0.62_0.2_25/0.12)] border border-[oklch(0.62_0.2_25/0.30)] text-[oklch(0.62_0.2_25)] hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Player inbox (icon button + dropdown panel) ─────────────────────────────────

function Inbox() {
  const [open,         setOpen]         = useState(false)
  const [activeTab,    setActiveTab]    = useState('invitations')
  const [invitations,  setInvitations]  = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading,      setLoading]      = useState(false)
  const [busyId,       setBusyId]       = useState(null)
  const ref = useRef(null)

  const totalCount = invitations.length + joinRequests.length

  const openInbox = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const [invs, reqs] = await Promise.all([
        getMyPendingInvitations().catch(() => []),
        getPendingJoinRequests().catch(() => []),
      ])
      setInvitations(invs)
      setJoinRequests(reqs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Optimistic UI: drop the row first, restore it on API error.
  const handleAcceptInv = async (inv) => {
    setInvitations(prev => prev.filter(i => i.id !== inv.id))
    setBusyId(`inv-${inv.id}`)
    try { await acceptInvitation(inv.id) }
    catch { setInvitations(prev => [inv, ...prev]) }
    finally { setBusyId(null) }
  }
  const handleDeclineInv = async (inv) => {
    setInvitations(prev => prev.filter(i => i.id !== inv.id))
    setBusyId(`inv-${inv.id}`)
    try { await declineInvitation(inv.id) }
    catch { setInvitations(prev => [inv, ...prev]) }
    finally { setBusyId(null) }
  }
  const handleAcceptJoin = async (req) => {
    setJoinRequests(prev => prev.filter(r => r.participantId !== req.participantId))
    setBusyId(`req-${req.participantId}`)
    try { await respondToJoinRequest(req.matchId, req.requesterUserId, 'accept') }
    catch { setJoinRequests(prev => [req, ...prev]) }
    finally { setBusyId(null) }
  }
  const handleRejectJoin = async (req) => {
    setJoinRequests(prev => prev.filter(r => r.participantId !== req.participantId))
    setBusyId(`req-${req.participantId}`)
    try { await respondToJoinRequest(req.matchId, req.requesterUserId, 'reject') }
    catch { setJoinRequests(prev => [req, ...prev]) }
    finally { setBusyId(null) }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openInbox}
        aria-label="Inbox"
        aria-expanded={open}
        className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors
          ${open
            ? 'border-[var(--green-border)] bg-[var(--green-muted)] text-white'
            : 'border-white/[0.07] bg-[var(--bg2)] hover:border-white/[0.14] text-[var(--text2)]'}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[oklch(0.62_0.2_25)] text-white font-display text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {totalCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-12 w-[440px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden flex flex-col
                       rounded-2xl border border-white/[0.07] bg-[var(--bg2)] shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50"
          >
            <div className="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[20px] font-bold text-white tracking-tight">Inbox</h2>
                  {totalCount > 0 && (
                    <span className="min-w-[22px] h-[22px] rounded-full bg-[oklch(0.62_0.2_25)] text-white font-display text-[11px] font-bold flex items-center justify-center px-1.5">
                      {totalCount}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--text3)] mt-1">
                  {totalCount === 0
                    ? 'No pending items'
                    : `${invitations.length} pending ${invitations.length === 1 ? 'invitation' : 'invitations'} · respond before they expire`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close inbox"
                className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-[var(--text2)] hover:text-white transition-colors text-[16px]"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-white/[0.06] px-5">
              {[
                { id: 'invitations',  label: 'Invitations',   count: invitations.length },
                { id: 'joinRequests', label: 'Join Requests', count: joinRequests.length },
              ].map(t => {
                const isActive = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-5 py-3 text-[14px] font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap flex items-center
                      ${isActive
                        ? 'text-white border-[var(--green)]'
                        : 'text-[var(--text3)] border-transparent hover:text-[var(--text2)]'}`}
                  >
                    {t.label}
                    {t.count > 0 && (
                      <span className={`ml-2 min-w-[18px] h-[18px] rounded-[9px] px-1.5 font-display text-[10px] font-bold flex items-center justify-center
                        ${isActive
                          ? 'bg-[var(--green-muted)] text-[var(--green)]'
                          : 'bg-[oklch(0.72_0.18_55/0.20)] text-[oklch(0.78_0.16_60)]'}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {loading && <p className="text-center text-[13px] text-[var(--text3)] py-8">Loading…</p>}

              {!loading && activeTab === 'invitations' && (
                invitations.length === 0
                  ? <p className="text-center text-[13px] text-[var(--text3)] py-10">No pending invitations.</p>
                  : invitations.map(inv => (
                      <InvitationCard key={`inv-${inv.id}`} inv={inv} onAccept={handleAcceptInv} onDecline={handleDeclineInv} busy={busyId === `inv-${inv.id}`} />
                    ))
              )}

              {!loading && activeTab === 'joinRequests' && (
                joinRequests.length === 0
                  ? <p className="text-center text-[13px] text-[var(--text3)] py-10">No pending join requests.</p>
                  : joinRequests.map(req => (
                      <JoinRequestCard key={`req-${req.participantId}`} req={req} onAccept={handleAcceptJoin} onReject={handleRejectJoin} busy={busyId === `req-${req.participantId}`} />
                    ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Mode switch (Player ⇄ Owner) ────────────────────────────────────────────────

function ModeSwitch({ mode, onChange, className }) {
  return (
    <div
      role="group"
      aria-label="Switch between Player and Owner"
      className={cn('inline-flex items-center rounded-full border border-white/[0.08] bg-[var(--bg2)] p-0.5', className)}
    >
      {[
        { id: MODES.PLAYER, label: 'Player' },
        { id: MODES.OWNER,  label: 'Owner'  },
      ].map(opt => {
        const active = mode === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-bold transition-colors',
              active ? 'bg-[var(--green)] text-[var(--primary-foreground)]' : 'text-[var(--text2)] hover:text-white',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Nav link primitives ─────────────────────────────────────────────────────────

function NavLinkButton({ onClick, children, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'hover:text-white transition-colors',
        active ? 'text-[var(--green)] font-semibold' : 'text-[var(--text2)]',
      )}
    >
      {children}
    </button>
  )
}

function ComingSoon({ label }) {
  return (
    <span className="relative group">
      <button type="button" disabled className="hover:text-white transition-colors opacity-50 cursor-not-allowed">{label}</button>
      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1f1c] border border-[#2a3330] px-2 py-1 text-[11px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity z-50">
        Coming soon
      </span>
    </span>
  )
}

function MenuItem({ onClick, children, danger }) {
  return (
    <motion.button
      whileHover={{ x: 3 }}
      onClick={onClick}
      role="menuitem"
      className={cn(
        'w-full text-left px-3 py-2 transition-colors',
        danger
          ? 'hover:bg-[var(--red-muted)] text-[var(--text2)] hover:text-[oklch(0.62_0.2_25)] border-t border-white/[0.06] mt-1 pt-2'
          : 'hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white',
      )}
    >
      {children}
    </motion.button>
  )
}

// ── Main navbar ─────────────────────────────────────────────────────────────────

export default function Navbar() {
  const navigate = useNavigate()
  const { token, roles, username, logout, isLoading } = useAuth()
  const [mode, setMode] = useActiveMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const isAuthed = !!token
  const isPlayer = roles.includes(ROLES.PLAYER)
  const isOwner  = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin  = roles.includes(ROLES.ADMIN)
  const hasBoth  = isPlayer && isOwner

  // Which world's nav set to render. Dual-role users follow the active mode;
  // single-role users follow their one role. Admin nav is layered on top.
  const playerView = isPlayer && (!isOwner || mode === MODES.PLAYER)
  const ownerView  = isOwner  && (!isPlayer || mode === MODES.OWNER)

  const logoHref = isAuthed ? getRoleHomePath(roles) : '/pitches'

  const go = useCallback((path) => { setMenuOpen(false); navigate(path) }, [navigate])

  const handleModeChange = (next) => {
    if (next === mode) return
    setMode(next)
    setMenuOpen(false)
    // Take the user to the chosen world's home so the switch has a visible effect.
    navigate(next === MODES.OWNER ? '/dashboard/owner' : '/dashboard')
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey   = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const avatarChar = (username || roles[0] || 'U')[0].toUpperCase()

  // While the session is being restored we don't yet know if the user is a guest
  // or authenticated — render a logo-only header to avoid flashing the guest CTAs.
  if (isLoading) {
    return (
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
        <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
            <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
          </span>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => navigate(logoHref)} className="flex items-center gap-2 group">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        {/* Center nav */}
        <ul className="hidden md:flex items-center gap-8 text-[13px]">
          {(!isAuthed || playerView) && (
            <>
              <li><NavLinkButton onClick={() => navigate('/pitches')}>Pitches</NavLinkButton></li>
              <li><NavLinkButton onClick={() => navigate('/matches/open')}>Find Games</NavLinkButton></li>
              <li><ComingSoon label="Leagues" /></li>
              <li><ComingSoon label="Coaching" /></li>
            </>
          )}
          {isAuthed && ownerView && (
            <>
              <li><NavLinkButton onClick={() => navigate('/dashboard/pitches')}>My Pitches</NavLinkButton></li>
              <li><NavLinkButton onClick={() => navigate('/dashboard/bookings')}>Bookings</NavLinkButton></li>
              <li><NavLinkButton onClick={() => navigate('/pitches')}>Browse Pitches</NavLinkButton></li>
            </>
          )}
          {isAdmin && (
            <>
              <li><NavLinkButton onClick={() => navigate('/admin/pitches')}>Pitch Approvals</NavLinkButton></li>
              <li><NavLinkButton onClick={() => navigate('/admin/users')}>Users</NavLinkButton></li>
            </>
          )}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!isAuthed && (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="rounded-full bg-[var(--green)] px-4 py-2 text-[12px] font-bold text-[var(--primary-foreground)]
                           shadow-[0_4px_12px_var(--green-glow)] hover:brightness-110 transition-all"
              >
                Register
              </button>
            </>
          )}

          {isAuthed && (
            <>
              {/* Mode switch (dual-role only) */}
              {hasBoth && <ModeSwitch mode={mode} onChange={handleModeChange} className="hidden sm:inline-flex mr-1" />}

              {/* Quick actions per view */}
              {ownerView && (
                <button
                  onClick={() => navigate('/dashboard/pitches/new')}
                  className="hidden sm:inline-flex px-4 py-2 rounded-full bg-[var(--green-muted)] border border-[var(--green-border)]
                             text-[var(--green)] text-[12px] font-bold hover:bg-[var(--green)] hover:text-[var(--primary-foreground)] transition-all"
                >
                  + New Pitch
                </button>
              )}
              {playerView && (
                <button
                  onClick={() => navigate('/my-bookings')}
                  className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
                >
                  My Bookings
                </button>
              )}

              {/* Inbox (player view only) */}
              {playerView && <Inbox />}

              {/* Avatar + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="User menu"
                  className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-[var(--bg2)] px-2 py-1.5 hover:border-[var(--green-border)] transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-[var(--green)] text-[var(--primary-foreground)] text-[12px] font-bold flex items-center justify-center">
                    {avatarChar}
                  </span>
                  <span className="hidden sm:inline text-[12px] font-semibold pr-1 max-w-[120px] truncate">{username || 'Account'}</span>
                  <span className="text-[10px] text-[var(--text3)] pr-1">▾</span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-12 w-56 rounded-xl border border-white/[0.07] bg-[var(--surface)] shadow-2xl py-2 text-[13px]"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">Signed in as</p>
                      <p className="text-white font-semibold mt-0.5 truncate">{username || 'User'}</p>
                    </div>

                    {/* Mode switch inside the menu (reachable on mobile) */}
                    {hasBoth && (
                      <div className="px-3 py-2 border-b border-white/[0.06] sm:hidden">
                        <ModeSwitch mode={mode} onChange={handleModeChange} className="w-full justify-center" />
                      </div>
                    )}

                    {playerView && (
                      <>
                        <MenuItem onClick={() => go('/my-bookings')}>My Bookings</MenuItem>
                        <MenuItem onClick={() => go('/favorites')}>My Favorites</MenuItem>
                        <MenuItem onClick={() => go('/matches/open')}>Find Games</MenuItem>
                      </>
                    )}
                    {ownerView && (
                      <>
                        <MenuItem onClick={() => go('/dashboard/owner')}>Owner Dashboard</MenuItem>
                        <MenuItem onClick={() => go('/dashboard/pitches')}>My Pitches</MenuItem>
                        <MenuItem onClick={() => go('/dashboard/bookings')}>Bookings</MenuItem>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <MenuItem onClick={() => go('/admin/pitches')}>Pitch Approvals</MenuItem>
                        <MenuItem onClick={() => go('/admin/users')}>Users</MenuItem>
                      </>
                    )}
                    <MenuItem onClick={() => go('/settings')}>Settings</MenuItem>
                    <MenuItem onClick={handleLogout} danger>Sign out</MenuItem>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

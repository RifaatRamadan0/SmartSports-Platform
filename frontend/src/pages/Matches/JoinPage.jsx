import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, MapPin, User, Users, Link, ArrowLeft } from 'lucide-react'
import { cardVariants, listContainerVariants, listItemVariants, cardTap, buttonHover, buttonTap } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/constants/roles'
import { getJoinPreview, joinViaToken } from '@/services/Invitation/invitationService'
import { parseApiError } from '@/utils/errorUtils'
import Toast from '@/components/ui/Toast'
import FieldLines from '@/components/Match/FieldLines'

// ── Sport colours (mirrors FindGamePage) ──────────────────────────────────────

const SPORT_HEAD_BG = {
  Football:   '#0f2016',
  Futsal:     '#0c1a18',
  Basketball: '#1a0e0c',
  Tennis:     '#0c1420',
}

const SPORT_TAG_CLASS = {
  Football:   'bg-primary/10 text-primary border-primary/20',
  Futsal:     'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Basketball: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Tennis:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(t) { return t.slice(0, 5) }

function timeUntil(dateStr, timeStr) {
  const diff = new Date(`${dateStr}T${timeStr}`) - Date.now()
  if (diff <= 0) return null
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins  = Math.floor((diff % 3600000)  / 60000)
  if (days > 0)  return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${mins}min`
  return `in ${mins}min`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-[20px] overflow-hidden animate-pulse">
          <div className="p-6 pb-5 space-y-3 bg-muted/20">
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-6 w-[55%] rounded bg-muted" />
            <div className="h-4 w-[45%] rounded bg-muted" />
          </div>
          <div className="px-6 py-5 space-y-4 border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3.5 w-[30%] rounded bg-muted" />
                <div className="h-3.5 w-[40%] rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 border-t border-border pt-5">
            <div className="h-11 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Invalid link state ────────────────────────────────────────────────────────

function InvalidLink({ message }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background px-6 py-10 flex items-center justify-center">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-card border border-border rounded-[20px] p-10 text-center"
      >
        <p className="text-4xl mb-4">🔗</p>
        <p className="text-foreground font-bold text-lg mb-2">Invalid invite link</p>
        <p className="text-[13px] text-muted-foreground mb-6">{message}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity"
        >
          Go to dashboard
        </button>
      </motion.div>
    </div>
  )
}

// ── Fill bar (mirrors FindGamePage's progress bar) ────────────────────────────

function FillBar({ current, max }) {
  const pct      = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const barColor = pct >= 80 ? '#f59e0b' : 'var(--green)'
  const spotsLeft = Math.max(0, max - current)

  return (
    <div className="px-6 pt-4 pb-0 border-t border-border">
      <div className="flex items-center justify-between text-[12px] mb-2">
        <span className="text-muted-foreground">{current} / {max} players joined</span>
        {spotsLeft === 0
          ? <span className="text-muted-foreground font-medium">No spots left</span>
          : <span className="font-display text-primary font-semibold">
              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
            </span>
        }
      </div>
      <div className="h-[6px] bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: barColor,
            transition: 'width 0.55s cubic-bezier(0.34,1.2,0.64,1)',
          }}
        />
      </div>
    </div>
  )
}

// ── Join success overlay ──────────────────────────────────────────────────────

function JoinSuccess({ organizerName, isInstant, onGoHome }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="bg-card border border-border rounded-[20px] px-6 py-12 text-center mb-4"
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.05 }}
        className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6"
      >
        <svg viewBox="0 0 52 52" className="w-11 h-11" fill="none">
          <motion.circle
            cx="26" cy="26" r="23"
            stroke="var(--color-primary)" strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
          />
          <motion.path
            d="M14 27 l8 8 l16 -16"
            stroke="var(--color-primary)" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.55 }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.75 }}
      >
        <p
          className="font-display text-[22px] font-extrabold text-foreground mb-2"
          style={{ letterSpacing: '-0.5px' }}
        >
          {isInstant ? "You're in!" : 'Request sent!'}
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-7">
          {isInstant ? (
            <>You've joined @{organizerName}'s match.<br />See you on the pitch.</>
          ) : (
            <>@{organizerName} will review your request.<br />You'll be notified when it's accepted.</>
          )}
        </p>
        <motion.button
          whileHover={buttonHover}
          whileTap={buttonTap}
          onClick={onGoHome}
          className="font-display rounded-full bg-primary text-[var(--primary-foreground)] text-[13px] font-bold px-6 py-2.5
                     hover:opacity-[0.88] transition-opacity"
        >
          Go to dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        {Icon && <Icon size={13} />}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <span className={cn('text-[13px] font-semibold text-right', valueClass ?? 'text-foreground')}>
        {value}
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JoinPage() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { token: authToken, roles } = useAuth()
  const isAuthenticated = !!authToken
  const isPlayer        = roles.includes(ROLES.PLAYER)

  const [preview,   setPreview]   = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const [joined,    setJoined]    = useState(false)
  const [toast,     setToast]     = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchPreview = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await getJoinPreview(token)
      setPreview(data)
    } catch (err) {
      const status = err?.response?.status
      setLoadError(
        status === 404
          ? 'This invite link is invalid or no longer exists.'
          : parseApiError(err, 'Failed to load match details.')
      )
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  async function handleJoin() {
    // Action-level auth: the preview is public, but joining requires a Player.
    // Guests get bounced to /login with `from` set so useLoginForm returns them
    // here after sign-in (preserves search + hash too).
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: location.pathname + location.search + location.hash },
      })
      return
    }
    if (!isPlayer) {
      showToast('Switch to a player account to join matches.', 'error')
      return
    }

    setIsJoining(true)
    try {
      await joinViaToken(token)
      setJoined(true)
      showToast(isInstantJoin
        ? "You're in! Enjoy the match."
        : 'Request sent! The organizer will review it.')
    } catch (err) {
      showToast(parseApiError(err, 'Could not join match.'), 'error')
    } finally {
      setIsJoining(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Invite link copied to clipboard!')
    } catch {
      showToast('Could not copy link — please copy the URL manually.', 'error')
    }
  }

  if (isLoading) return <Skeleton />
  if (loadError) return <InvalidLink message={loadError} />

  const countdown    = timeUntil(preview.matchDate, preview.startTime)
  const isFull       = preview.spotsLeft === 0
  // Match state is independent of auth — guests can still see + click the button;
  // handleJoin redirects them to /login. Only block authenticated non-players.
  const matchJoinable = !preview.isExpired && !isFull && !joined
  const canJoin       = matchJoinable && (!isAuthenticated || isPlayer)
  // Public matches (isOpenToJoin) auto-accept the join — no organizer approval needed.
  // Private matches stay on the request → approve flow.
  const isInstantJoin = preview.isOpenToJoin
  const joinLabel = !isAuthenticated
    ? 'Sign in to join'
    : (isInstantJoin ? 'Join now' : 'Request to join')

  const headBg   = SPORT_HEAD_BG[preview.sportName] ?? '#111'
  const tagClass = SPORT_TAG_CLASS[preview.sportName] ?? 'bg-muted/20 text-muted-foreground border-border'
  const initials = (preview.organizerName ?? '??').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-lg mx-auto">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={15} />
          Back
        </motion.button>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-7"
        >
          {/* Fix #11: heading adapts to match state so expired/full users aren't misled */}
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-primary mb-1">
            {preview.isExpired ? 'Link expired' : preview.spotsLeft === 0 ? 'Match full' : "You're invited"}
          </p>
          <h1
            className="font-display text-[32px] font-extrabold leading-none text-foreground"
            style={{ letterSpacing: '-1px' }}
          >
            {preview.isExpired ? 'This link has expired' : preview.spotsLeft === 0 ? 'This match is full' : 'Join the game'}
          </h1>
        </motion.div>

        {/* Main card / success — AnimatePresence swaps between them */}
        <AnimatePresence mode="wait">
          {joined ? (
            <JoinSuccess key="success" organizerName={preview.organizerName} isInstant={isInstantJoin} onGoHome={() => navigate('/dashboard')} />
          ) : (
            <motion.div
              key="card"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
              className="bg-card border border-border rounded-[20px] overflow-hidden mb-4"
            >
              {/* Sport header */}
              <div className="relative overflow-hidden p-5 pb-4.5" style={{ background: headBg }}>
                <FieldLines />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className={cn('rounded-full border text-[11px] font-bold tracking-wide uppercase px-3 py-1', tagClass)}>
                      {preview.sportName}
                    </span>
                    {preview.isExpired ? (
                      <span className="rounded-full border border-[var(--red)]/40 bg-[var(--red)]/15 text-[var(--red)] text-[11px] font-semibold px-2.5 py-1">
                        Expired
                      </span>
                    ) : isFull ? (
                      <span className="rounded-full border border-border bg-muted/30 text-muted-foreground text-[11px] font-semibold px-2.5 py-1">
                        Full
                      </span>
                    ) : countdown ? (
                      <span className="animate-pulse rounded-full border border-primary/40 bg-primary/15 text-primary text-[11px] font-bold px-2.5 py-1 flex items-center gap-1">
                        <Clock size={11} />
                        {countdown}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="font-display text-[20px] font-bold leading-snug mb-1.5 text-foreground"
                    style={{ letterSpacing: '-0.4px' }}
                  >
                    {preview.pitchName}
                  </p>
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Calendar size={13} className="shrink-0" />
                    {fmtDate(preview.matchDate)} · {fmtTime(preview.startTime)}–{fmtTime(preview.endTime)}
                  </div>
                </div>
              </div>

              {/* Fill bar */}
              <FillBar current={preview.currentPlayers} max={preview.maxPlayers} />

              {/* Detail rows */}
              <div className="px-6 py-1">
                <DetailRow icon={MapPin} label="City"           value={preview.cityName} />
                <DetailRow icon={User}   label="Organizer"      value={`@${preview.organizerName}`} />
                <DetailRow
                  icon={Users}
                  label="Price / player"
                  value={`$${Number(preview.pricePerPlayer).toFixed(2)}`}
                  valueClass="text-primary font-bold"
                />
              </div>

              {/* Organizer + action footer */}
              <div className="px-6 pt-4 pb-5 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="font-display w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 font-extrabold text-[var(--primary-foreground)]"
                    style={{ fontSize: 10 }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted-foreground truncate">@{preview.organizerName}</p>
                    <p className="text-[10px] text-muted-foreground/60">Organizer</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {canJoin ? (
                    <motion.button
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                      onClick={handleJoin}
                      disabled={isJoining}
                      className="font-display rounded-full bg-primary text-[var(--primary-foreground)] text-[13px] font-bold px-5 py-2.5
                                 hover:opacity-[0.88] transition-opacity disabled:opacity-50"
                    >
                      {isJoining ? 'Sending…' : joinLabel}
                    </motion.button>
                  ) : preview.isExpired ? (
                    <span className="text-[13px] text-muted-foreground font-medium px-2">Link expired</span>
                  ) : isFull ? (
                    <span className="text-[13px] text-muted-foreground font-medium px-2">Match full</span>
                  ) : isAuthenticated && !isPlayer ? (
                    <span className="text-[13px] text-muted-foreground font-medium px-2">Player account required</span>
                  ) : (
                    <span className="text-[13px] text-muted-foreground font-medium px-2">Not available</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accepted players — hidden after join to keep success state clean */}
        <AnimatePresence>
          {!joined && preview.acceptedPlayers?.length > 0 && (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="bg-card border border-border rounded-[20px] px-6 py-5 mb-4"
            >
              <p className="text-[9px] font-semibold tracking-[0.7px] uppercase text-muted-foreground mb-3">
                Players in ({preview.acceptedPlayers.length})
              </p>
              <motion.div
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-2"
              >
                {preview.acceptedPlayers.map(p => (
                  <motion.span
                    key={p.username}
                    variants={listItemVariants}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full
                               bg-muted border border-border
                               text-[12px] font-medium text-muted-foreground"
                  >
                    <span
                      className="w-4 h-4 rounded-full bg-primary flex items-center justify-center
                                 text-[var(--primary-foreground)] font-bold shrink-0"
                      style={{ fontSize: 7 }}
                    >
                      {p.username[0].toUpperCase()}
                    </span>
                    {p.username}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Copy link */}
        <motion.button
          whileHover={buttonHover}
          whileTap={cardTap}
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2
                     rounded-[20px] border border-border bg-card
                     py-3.5 text-[13px] font-semibold text-muted-foreground
                     hover:text-foreground hover:border-white/14 transition-colors"
        >
          <Link size={14} />
          Copy invite link
        </motion.button>

      </div>

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

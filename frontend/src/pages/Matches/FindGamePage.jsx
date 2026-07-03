import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react'
import PageWrapper from '@/components/routing/PageWrapper'
import { cardVariants, cardTap, listContainerVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { listOpenMatches, listMyMatches, getMatchStats, joinMatch, leaveMatch, getMyMatchStatus } from '../../services/Match/matchService'
import { parseApiError } from '../../utils/errorUtils'
import { useAuth } from '../../hooks/useAuth'
import Toast from '../../components/ui/Toast'
import { ROLES } from '../../constants/roles'
import FieldLines from '../../components/Match/FieldLines'
import { CardSkeleton } from '../../components/ui/Skeleton'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatMatchDateTime(bookingDate, startTime, endTime) {
  const date = new Date(bookingDate + 'T00:00:00')
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
}

// Sport-specific dark gradient background for card head (matches design reference)
const SPORT_HEAD_BG = {
  Football:   '#0f2016',
  Futsal:     '#0c1a18',
  Basketball: '#1a0e0c',
  Tennis:     '#0c1420',
}

// Sport tag pill colour tokens
const SPORT_TAG_CLASS = {
  Football:   'bg-primary/10 text-primary border-primary/20',
  Futsal:     'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Basketball: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Tennis:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

// ── stats banner ─────────────────────────────────────────────────────────────

function StatsBanner({ statsResult }) {
  const loading = statsResult === null  // null = still fetching; false = failed; object = loaded

  // SportsCount is derived from the existing bySport breakdown — no extra backend field.
  // "Real-time spots" is a static badge that reassures the count updates as people join.
  const blocks = [
    { label: 'OPEN GAMES',      value: statsResult?.openGamesCount },
    { label: 'CITIES',          value: statsResult?.citiesCount },
    { label: 'SPORTS',          value: statsResult ? (statsResult.bySport?.length ?? 0) : null },
    { label: 'REAL-TIME SPOTS', value: 'Live' },
  ]

  return (
    <div className="flex items-center bg-card border border-border rounded-[18px] overflow-hidden mb-7">
      {blocks.map(({ label, value, fallback }, i) => (
        <div key={i} className="contents">
          <div className="flex-1 flex flex-col items-center py-5 px-8 gap-0.5 text-center">
            {loading ? (
              <div className="animate-pulse w-full flex flex-col items-center gap-2">
                <div className="h-7 w-[55%] rounded bg-muted" />
                <div className="h-3 w-[40%] rounded bg-muted" />
              </div>
            ) : (
              <>
                <span
                  className="font-display font-extrabold text-primary leading-none mb-0.5"
                  style={{ fontSize: 26, letterSpacing: '-0.8px' }}
                >
                  {value ?? fallback ?? '—'}
                </span>
                <span className="text-[10px] font-semibold tracking-[0.7px] uppercase text-muted-foreground">
                  {label}
                </span>
              </>
            )}
          </div>
          {i < blocks.length - 1 && (
            <div className="w-px self-center bg-border" style={{ height: 40 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── filter bar ────────────────────────────────────────────────────────────────

function FilterPill({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border text-[13px] font-medium px-[18px] py-2 flex items-center gap-1.5 transition-all whitespace-nowrap',
        active
          ? 'bg-primary/12 border-primary/28 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-white/14 hover:text-foreground',
      )}
    >
      {label}
      {count != null && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[17px] h-[17px] rounded-[9px] px-1 text-[10px] font-bold transition-all',
            active ? 'bg-primary text-[var(--primary-foreground)]' : 'bg-white/7 text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function FilterBar({ statsResult, filters, setFilter, clearAllFilters, totalCount, resultCount }) {
  const sports = statsResult?.bySport ?? []
  const cities = statsResult?.byCity  ?? []
  const noneActive = !filters.sport && !filters.city

  return (
    <div className="flex gap-2 flex-wrap mb-7 items-center">
      {/* "All" pill — active when no filter is selected */}
      <FilterPill
        label="All"
        count={totalCount ?? null}
        active={noneActive}
        onClick={clearAllFilters}
      />
      {sports.map(({ name, count }) => (
        <FilterPill
          key={name}
          label={name}
          count={count}
          active={filters.sport === name}
          onClick={() => setFilter('sport', name)}
        />
      ))}
      {cities.map(({ name, count }) => (
        <FilterPill
          key={name}
          label={name}
          count={count}
          active={filters.city === name}
          onClick={() => setFilter('city', name)}
        />
      ))}
      {resultCount != null && (
        <span className="ml-auto text-[13px] text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'game' : 'games'} available
        </span>
      )}
    </div>
  )
}

// ── match card ────────────────────────────────────────────────────────────────

function MatchCard({ match, userStatus, isOrganizer, onJoin, onLeave, onLoginRedirect, actionLoading, actionVerb, statusLoading }) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const fillPct   = Math.min(100, Math.round((match.acceptedCount / match.maxPlayers) * 100))
  const isFull    = match.acceptedCount >= match.maxPlayers
  const spotsLeft = match.maxPlayers - match.acceptedCount

  const headBg   = SPORT_HEAD_BG[match.sportName] ?? '#111'
  const tagClass = SPORT_TAG_CLASS[match.sportName] ?? 'bg-muted/20 text-muted-foreground border-border'
  const barColor = fillPct >= 80 ? '#f59e0b' : 'var(--green)'

  const initials = (match.organizerName ?? '??').slice(0, 2).toUpperCase()

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.12)' }}
      whileTap={cardTap}
      className="bg-card border border-border rounded-[20px] overflow-hidden flex flex-col"
      style={{ transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s' }}
    >

      {/* ── head (sport-coloured bg + field watermark) ── */}
      <div className="relative overflow-hidden p-5 pb-[18px]" style={{ background: headBg }}>
        <FieldLines />
        <div className="relative z-10">

          {/* sport tag + urgency badge */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <span className={cn('rounded-full border text-[11px] font-bold tracking-wide uppercase px-3 py-1', tagClass)}>
              {match.sportName}
            </span>
            {isFull ? (
              <span className="rounded-full border border-border bg-muted/30 text-muted-foreground text-[11px] font-semibold px-[10px] py-1 whitespace-nowrap">
                Full
              </span>
            ) : fillPct >= 80 ? (
              <span className="animate-pulse rounded-full border border-amber-500/45 bg-amber-500/22 text-amber-400 text-[11px] font-bold px-[10px] py-1 flex items-center gap-1 whitespace-nowrap">
                <Clock size={11} />
                Filling Fast
              </span>
            ) : null}
          </div>

          {/* pitch name */}
          <p
            className="font-display text-[19px] font-bold leading-snug mb-1.5 line-clamp-1 text-foreground"
            style={{ letterSpacing: '-0.4px' }}
          >
            {match.pitchName}
          </p>

          {/* date / time */}
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Calendar size={13} className="shrink-0" />
            {formatMatchDateTime(match.bookingDate, match.startTime, match.endTime)}
          </div>
        </div>
      </div>

      {/* ── fill section ── */}
      <div className="px-5 pt-3.5 pb-0 border-t border-border">
        <div className="flex items-center justify-between text-[12px] mb-2">
          <span className="text-muted-foreground">{match.acceptedCount} / {match.maxPlayers} players joined</span>
          {isFull
            ? <span className="text-muted-foreground font-medium">No spots left</span>
            : <span className="font-display text-primary font-semibold">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open</span>
          }
        </div>
        <div className="h-[6px] bg-muted rounded-full overflow-hidden mb-3.5">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              background: barColor,
              transition: 'width 0.55s cubic-bezier(0.34,1.2,0.64,1)',
            }}
          />
        </div>
      </div>

      {/* ── body: meta row ── */}
      <div className="px-5 py-3.5 flex items-stretch flex-1" style={{ gap: 0 }}>
        {/* Left — Location */}
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-[9px] font-semibold tracking-[0.7px] uppercase text-muted-foreground mb-1">Location</span>
          <span className="font-display text-[14px] font-bold text-foreground">
            {match.cityName}
          </span>
        </div>

        {/* Center — Price (total is the truth, per-player is a projection) */}
        <div
          className="flex flex-col items-center justify-center rounded-[14px] border border-border px-3.5 py-3 text-center"
          style={{ flex: '1.4', margin: '0 10px', background: 'linear-gradient(145deg, var(--muted) 0%, var(--card) 100%)' }}
          title={`≈ $${match.pricePerPlayer} / player if the match fills (${match.maxPlayers} players)`}
        >
          <span
            className="font-display text-primary font-extrabold leading-[1.05]"
            style={{ fontSize: 30, letterSpacing: '-1.5px' }}
          >
            <sup className="text-[15px] align-super" style={{ color: 'oklch(0.68 0.22 145 / 0.7)', letterSpacing: 0 }}>$</sup>
            {match.totalPrice}
          </span>
          <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-muted-foreground mt-0.5">
            total
          </span>
          <span className="text-[9px] text-muted-foreground/70 mt-1 leading-tight">
            ≈ ${match.pricePerPlayer}/player if full
          </span>
        </div>

      </div>

      {/* ── footer ── */}
      <div className="px-5 pt-3.5 pb-[18px] border-t border-border flex items-center justify-between gap-2.5">
        {/* organizer */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="font-display w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 font-extrabold text-[var(--primary-foreground)]"
            style={{ fontSize: 9 }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground truncate">@{match.organizerName}</p>
            <p className="text-[10px] text-muted-foreground/60">Organizer</p>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isOrganizer ? (
            <span className="text-[12px] text-muted-foreground font-medium px-3">Your match</span>
          ) : statusLoading ? (
            <div className="h-9 w-[100px] rounded-full bg-muted animate-pulse" />
          ) : userStatus === 'pending' ? (
            <>
              <button
                disabled
                className="rounded-full text-[13px] font-bold px-[22px] py-2.5 whitespace-nowrap bg-muted border border-border text-muted-foreground cursor-not-allowed"
              >
                Request Sent
              </button>
              <button
                onClick={() => onLeave(match.matchId)}
                disabled={actionLoading}
                className="text-[11px] text-[var(--red)] font-medium hover:opacity-[0.72] transition-opacity disabled:opacity-40"
              >
                {actionLoading ? `${actionVerb}...` : 'Withdraw'}
              </button>
            </>
          ) : userStatus === 'accepted' ? (
            <>
              <button
                disabled
                className="font-display rounded-full text-[13px] font-bold px-[22px] py-2.5 whitespace-nowrap bg-primary/20 border border-primary/30 text-primary cursor-not-allowed"
              >
                Joined ✓
              </button>
              {confirmLeave ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Leave match?</span>
                  <button
                    onClick={() => { setConfirmLeave(false); onLeave(match.matchId) }}
                    disabled={actionLoading}
                    className="text-[11px] text-[var(--red)] font-semibold hover:opacity-[0.72] transition-opacity disabled:opacity-40"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeave(true)}
                  disabled={actionLoading}
                  className="text-[11px] text-[var(--red)] font-medium hover:opacity-[0.72] transition-opacity disabled:opacity-40"
                >
                  Leave
                </button>
              )}
            </>
          ) : userStatus === 'rejected' ? (
            <span className="text-[12px] text-muted-foreground font-medium px-2">Request rejected</span>
          ) : onLoginRedirect ? (
            <button
              onClick={onLoginRedirect}
              className="font-display rounded-full text-[13px] font-bold px-[22px] py-2.5 whitespace-nowrap bg-primary text-[var(--primary-foreground)] hover:opacity-[0.88] active:scale-[0.97] transition-all"
            >
              Log in to join
            </button>
          ) : (
            <button
              onClick={() => onJoin && onJoin(match.matchId)}
              disabled={isFull || !onJoin || actionLoading}
              className={cn(
                'rounded-full text-[13px] font-bold px-[22px] py-2.5 whitespace-nowrap transition-all',
                isFull || !onJoin
                  ? 'bg-muted border border-border text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-[var(--primary-foreground)] hover:opacity-[0.88] active:scale-[0.97]',
              )}
            >
              {actionLoading ? `${actionVerb}...` : 'Join Game'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}


// ── error / empty ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-8 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/10 px-5 py-4 flex items-center justify-between gap-4">
      <p className="text-sm text-[var(--red)]">{message}</p>
      <button onClick={onRetry} className="shrink-0 text-sm font-medium text-[var(--red)] underline underline-offset-2">
        Retry
      </button>
    </div>
  )
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="mt-16 text-center space-y-3">
      <p className="text-2xl">🏟️</p>
      <p className="text-foreground font-semibold">No open matches found</p>
      {hasFilters ? (
        <p className="text-sm text-muted-foreground">
          Try different filters —{' '}
          <button onClick={onClear} className="underline underline-offset-2 text-primary">
            clear all
          </button>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No upcoming open matches right now. Check back later.</p>
      )}
    </div>
  )
}

// ── pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, hasPrev, hasNext, onPrev, onNext, setPage }) {
  if (totalPages <= 1) return null

  const pages = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const list = []
    if (page > 3) { list.push(1); if (page > 4) list.push('…') }
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) list.push(i)
    if (page < totalPages - 2) { if (page < totalPages - 3) list.push('…'); list.push(totalPages) }
    return list
  })()

  const btnBase = 'w-9 h-9 rounded-xl border text-sm font-medium transition-all flex items-center justify-center'

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className={cn(btnBase, 'border-border bg-card text-muted-foreground hover:border-white/14 hover:text-foreground', !hasPrev && 'opacity-40 cursor-not-allowed')}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => p !== page && setPage(p)}
            className={cn(
              btnBase,
              p === page
                ? 'bg-primary text-[var(--primary-foreground)] border-primary font-bold'
                : 'border-border bg-card text-muted-foreground hover:border-white/14 hover:text-foreground',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={onNext}
        disabled={!hasNext}
        className={cn(btnBase, 'border-border bg-card text-muted-foreground hover:border-white/14 hover:text-foreground', !hasNext && 'opacity-40 cursor-not-allowed')}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── my games section ─────────────────────────────────────────────────────────

// Title row + green count pill on the left, muted right-aligned subtitle —
// mirrors the design reference where "My Games" sits opposite "Matches you're
// organising or have joined".
function MyGamesHeader({ count }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2
        className="font-display text-[24px] font-extrabold text-foreground flex items-center gap-2.5"
        style={{ letterSpacing: '-0.5px' }}
      >
        My Games
        {count != null && (
          <span
            className="font-display inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-primary text-[var(--primary-foreground)] text-[12px] font-bold px-2 shadow-[0_0_18px_var(--green-glow)]"
          >
            {count}
          </span>
        )}
      </h2>
      <span className="text-[13px] text-muted-foreground">
        Matches you're organising or have joined
      </span>
    </div>
  )
}

function MyGamesSection({ myMatches, error, onRetry, userId, onLeave, actionLoading }) {
  // Loading: skeletons identical to Open Games but capped at 3 rows since the
  // typical user has only a handful of in-flight matches.
  if (myMatches === null) {
    return (
      <section className="mb-10">
        <MyGamesHeader count={null} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} delay={i * 0.1} />)}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mb-10">
        <MyGamesHeader count={null} />
        <ErrorBanner message={error} onRetry={onRetry} />
      </section>
    )
  }

  // Empty: a single muted callout, not the big "🏟️ No matches" used by Open
  // Games, so users don't think the whole page failed.
  if (myMatches.length === 0) {
    return (
      <section className="mb-10">
        <MyGamesHeader count={0} />
        <div className="rounded-[18px] border border-dashed border-border bg-card/40 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You're not in any upcoming matches yet. Browse Open Games below to join one.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <MyGamesHeader count={myMatches.length} />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {myMatches.map(m => (
          <MatchCard
            key={`my-${m.matchId}`}
            match={m}
            userStatus={m.myStatus ?? null}
            isOrganizer={m.myRole === 'organizer' || m.organizerId === userId}
            onJoin={null}
            onLeave={onLeave}
            onLoginRedirect={null}
            actionLoading={actionLoading?.matchId === m.matchId}
            actionVerb={actionLoading?.matchId === m.matchId ? actionLoading.verb : null}
            statusLoading={false}
          />
        ))}
      </motion.div>
    </section>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FindGamePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { userId, roles } = useAuth()
  const isPlayer       = roles.includes(ROLES.PLAYER)
  const isAuthenticated = !!userId

  const urlSport = searchParams.get('sport') ?? ''
  const urlCity  = searchParams.get('city')  ?? ''
  const urlPage  = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const [refreshKey,    setRefreshKey]    = useState(0)
  const [statsResult,   setStatsResult]   = useState(null)
  const [result,        setResult]        = useState(null)
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState(null)
  const [myMatches,     setMyMatches]     = useState(null)   // null = loading / not fetched, [] = none
  const [myMatchesError, setMyMatchesError] = useState(null)
  const [joinedMatches, setJoinedMatches] = useState(new Map()) // matchId → 'pending'|'accepted'|'rejected'
  const [actionLoading,   setActionLoading]   = useState(null)  // { matchId, verb } | null
  const [isStatusLoading, setIsStatusLoading] = useState(false) // true while pre-fetching join statuses
  const [toast,           setToast]           = useState(null)

  // Fetch "My Games" — only meaningful for authenticated players. Refreshed
  // whenever refreshKey bumps (e.g. after join/leave) so the section stays in
  // sync with the user's actions on the Open Games list.
  useEffect(() => {
    if (!isPlayer || !userId) {
      setMyMatches([])
      return
    }
    let cancelled = false
    setMyMatchesError(null)
    listMyMatches()
      .then(data => { if (!cancelled) setMyMatches(data ?? []) })
      .catch(err  => { if (!cancelled) setMyMatchesError(parseApiError(err, 'Could not load your games.')) })
    return () => { cancelled = true }
  }, [isPlayer, userId, refreshKey])

  // Load stats once on mount — false = "failed but done" so the banner exits skeleton state
  useEffect(() => {
    getMatchStats()
      .then(data => setStatsResult(data))
      .catch(() => setStatsResult(false))
  }, [])

  // Fetch matches whenever URL-driven filters or refresh key change
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listOpenMatches({ sport: urlSport, city: urlCity, page: urlPage, pageSize: 9 })
      .then(async data => {
        if (cancelled) return
        setResult(data)

        // Pre-populate join state for the current page (players only)
        if (isPlayer && userId && data.items?.length) {
          setIsStatusLoading(true)
          try {
            const statuses = await Promise.all(
              data.items.map(m => getMyMatchStatus(m.matchId))
            )
            if (!cancelled) {
              setJoinedMatches(prev => {
                const next = new Map(prev)
                data.items.forEach((m, i) => {
                  if (statuses[i]) next.set(m.matchId, statuses[i].status)
                  else next.delete(m.matchId)
                })
                return next
              })
            }
          } finally {
            if (!cancelled) setIsStatusLoading(false)
          }
        }
      })
      .catch(err  => { if (!cancelled) setError(parseApiError(err, 'Could not load matches.')) })
      .finally(()  => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [urlSport, urlCity, urlPage, refreshKey, isPlayer, userId])

  const handleJoin = useCallback(async (matchId) => {
    setActionLoading({ matchId, verb: 'Joining' })
    try {
      await joinMatch(matchId)
      setJoinedMatches(prev => new Map(prev).set(matchId, 'accepted'))
      // Public-join auto-accepts, so bump the local acceptedCount immediately —
      // otherwise the "X / Y players" + "spots open" labels stay stale until refetch.
      setResult(prev => prev && {
        ...prev,
        items: prev.items.map(m =>
          m.matchId === matchId ? { ...m, acceptedCount: (m.acceptedCount ?? 0) + 1 } : m
        ),
      })
      setRefreshKey(k => k + 1)  // refresh My Games so the new join appears there
      setToast({ type: 'success', message: "You're in! Enjoy the match." })
    } catch (err) {
      const status = err.response?.status
      const msg = status === 409
        ? "You're already in this match."
        : parseApiError(err, 'Could not join match.')
      setToast({ type: 'error', message: msg })
    } finally {
      setActionLoading(null)
    }
  }, [])

  const handleLeave = useCallback(async (matchId) => {
    const wasAccepted = joinedMatches.get(matchId) === 'accepted'
    const verb = wasAccepted ? 'Leaving' : 'Withdrawing'
    setActionLoading({ matchId, verb })
    try {
      await leaveMatch(matchId)
      setJoinedMatches(prev => { const next = new Map(prev); next.delete(matchId); return next })
      // Only accepted participants counted toward acceptedCount; withdrawing a pending
      // invite-link request leaves the displayed count unchanged.
      if (wasAccepted) {
        setResult(prev => prev && {
          ...prev,
          items: prev.items.map(m =>
            m.matchId === matchId ? { ...m, acceptedCount: Math.max(0, (m.acceptedCount ?? 0) - 1) } : m
          ),
        })
      }
      setRefreshKey(k => k + 1)  // refresh My Games so the dropped row disappears
      setToast({ type: 'success', message: 'You left the match.' })
    } catch (err) {
      setToast({ type: 'error', message: parseApiError(err, 'Could not leave the match.') })
    } finally {
      setActionLoading(null)
    }
  }, [joinedMatches])

  const setFilter = useCallback((type, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const current = next.get(type) ?? ''
      if (value && current !== value) next.set(type, value)
      else next.delete(type)
      next.set('page', '1')
      return next
    })
  }, [setSearchParams])

  const setPage = useCallback((p) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })
  }, [setSearchParams])

  const clearAllFilters = () => setSearchParams({})
  const hasActiveFilters = !!(urlSport || urlCity)
  const filters = { sport: urlSport || null, city: urlCity || null }

  // De-dupe: a match the user organises or has joined already appears in
  // "My Games", so filter it out of "Other Open Games" client-side. Backend
  // returns both lists independently — this is the join layer.
  // Set-based lookup keeps the per-render cost O(items + my); for typical
  // page sizes (<10) it's negligible vs. a useMemo.
  const myMatchIds      = new Set((myMatches ?? []).map(m => m.matchId))
  const openItems       = (result?.items ?? []).filter(m => !myMatchIds.has(m.matchId))
  const hiddenOnPageCount = (result?.items?.length ?? 0) - openItems.length
  const otherOpenCount  = result ? Math.max(0, result.totalCount - hiddenOnPageCount) : null

  return (
    <>
    <PageWrapper className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-324 pt-12 pb-20 px-12">

        {/* Page header */}
        <div className="mb-9">
          <h1
            className="font-display text-[40px] font-extrabold leading-none mb-2 text-foreground"
            style={{ letterSpacing: '-1px' }}
          >
            Find Games
          </h1>
          <p className="text-[16px] text-muted-foreground max-w-[540px] leading-relaxed">
            Catch up on the matches you're organising or have joined, and find open spots in other games.
          </p>
        </div>

        {/* Stats banner */}
        <StatsBanner statsResult={statsResult} />

        {/* My Games section — only for authenticated players. Hidden entirely
            for guests and pitch owners since they have no matches to track. */}
        {isPlayer && userId && (
          <MyGamesSection
            myMatches={myMatches}
            error={myMatchesError}
            onRetry={() => setRefreshKey(k => k + 1)}
            userId={userId}
            onLeave={handleLeave}
            actionLoading={actionLoading}
          />
        )}

        {/* Divider between My Games and Open Games — only renders when My Games
            section is present (i.e. authenticated player) so guests don't see a
            floating rule above the only section on the page. */}
        {isPlayer && userId && <div className="border-t border-border mb-7" />}

        {/* Other Open Games heading + count pill */}
        <div className="flex items-baseline justify-between mb-4">
          <h2
            className="font-display text-[24px] font-extrabold text-foreground flex items-center gap-2.5"
            style={{ letterSpacing: '-0.5px' }}
          >
            Other Open Games
            {otherOpenCount != null && (
              <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-muted text-muted-foreground text-[12px] font-bold px-2">
                {otherOpenCount}
              </span>
            )}
          </h2>
        </div>

        {/* Filter bar */}
        <FilterBar
          statsResult={statsResult}
          filters={filters}
          setFilter={setFilter}
          clearAllFilters={clearAllFilters}
          totalCount={statsResult?.openGamesCount ?? null}
          resultCount={!isLoading && !error && result ? otherOpenCount : null}
        />

        {/* Results */}
        <main>
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} delay={i * 0.1} />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />
          )}

          {!isLoading && !error && openItems.length === 0 && (
            <EmptyState hasFilters={hasActiveFilters} onClear={clearAllFilters} />
          )}

          {!isLoading && !error && openItems.length > 0 && (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${urlSport}-${urlCity}-${urlPage}`}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {openItems.map(m => (
                    <MatchCard
                      key={m.matchId}
                      match={m}
                      userStatus={joinedMatches.get(m.matchId) ?? null}
                      isOrganizer={userId != null && m.organizerId === userId}
                      onJoin={isPlayer ? handleJoin : null}
                      onLeave={isPlayer ? handleLeave : null}
                      onLoginRedirect={!isAuthenticated ? () => navigate('/login') : null}
                      actionLoading={actionLoading?.matchId === m.matchId}
                      actionVerb={actionLoading?.matchId === m.matchId ? actionLoading.verb : null}
                      statusLoading={isPlayer && isStatusLoading}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          {!isLoading && !error && result && result.totalPages > 1 && (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hasPrev={result.hasPreviousPage}
              hasNext={result.hasNextPage}
              onPrev={() => setPage(urlPage - 1)}
              onNext={() => setPage(urlPage + 1)}
              setPage={setPage}
            />
          )}
        </main>
      </div>
    </PageWrapper>

    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
    </>
  )
}

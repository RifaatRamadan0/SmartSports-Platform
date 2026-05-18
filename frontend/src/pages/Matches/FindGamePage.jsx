import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react'
import PageWrapper from '@/components/routing/PageWrapper'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { listOpenMatches, getMatchStats } from '../../services/Match/matchService'
import { parseApiError } from '../../utils/errorUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatMatchDateTime(bookingDate, startTime, endTime) {
  const date = new Date(bookingDate + 'T00:00:00')
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
}

// Sport-specific dark gradient background for card head (matches design reference)
const SPORT_HEAD_BG = {
  Football:   '#0f2016',
  Futsal:     '#0c1521',
  Basketball: '#1a0e0c',
  Tennis:     '#0c1420',
}

// Sport tag pill colour tokens
const SPORT_TAG_CLASS = {
  Football:   'bg-primary/10 text-primary border-primary/20',
  Futsal:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Basketball: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Tennis:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

// ── field-lines watermark (inline SVG — card head only) ──────────────────────

function FieldLines() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.08 }}
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="398" height="158" rx="3" stroke="white" strokeWidth="2" />
      <line x1="200" y1="1" x2="200" y2="159" stroke="white" strokeWidth="1.5" />
      <circle cx="200" cy="80" r="36" stroke="white" strokeWidth="1.5" />
      <rect x="1" y="48" width="46" height="64" stroke="white" strokeWidth="1.5" />
      <rect x="353" y="48" width="46" height="64" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

// ── stats banner ─────────────────────────────────────────────────────────────

function StatsBanner({ statsResult }) {
  const loading = statsResult === null  // null = still fetching; false = failed; object = loaded

  const blocks = [
    { label: 'OPEN GAMES', value: statsResult?.openGamesCount },
    { label: 'CITIES',     value: statsResult?.citiesCount },
    {
      label: 'FROM',
      value: statsResult?.minPricePerPlayer != null
        ? `$${statsResult.minPricePerPlayer} / player`
        : null,
      fallback: '—',
    },
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
                  className="font-extrabold text-primary leading-none mb-0.5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, letterSpacing: '-0.8px' }}
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
            active ? 'bg-primary text-[#061008]' : 'bg-white/7 text-muted-foreground',
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

function MatchCard({ match }) {
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
            className="text-[19px] font-bold leading-snug mb-1.5 line-clamp-1 text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.4px' }}
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
            : <span className="text-primary font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open</span>
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
          <span className="text-[14px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {match.cityName}
          </span>
        </div>

        {/* Center — Price */}
        <div
          className="flex flex-col items-center justify-center rounded-[14px] border border-border px-3.5 py-3 text-center"
          style={{ flex: '1.4', margin: '0 10px', background: 'linear-gradient(145deg, var(--muted) 0%, var(--card) 100%)' }}
        >
          <span
            className="text-primary font-extrabold leading-[1.05]"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, letterSpacing: '-1.5px' }}
          >
            <sup className="text-[15px] align-super" style={{ color: 'oklch(0.68 0.22 145 / 0.7)', letterSpacing: 0 }}>$</sup>
            {match.pricePerPlayer}
          </span>
          <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-muted-foreground mt-0.5">
            per player
          </span>
        </div>

        {/* Right — Skill */}
        <div className="flex-1 flex flex-col justify-center items-end">
          <span className="text-[9px] font-semibold tracking-[0.7px] uppercase text-muted-foreground mb-1">Skill</span>
          <span className="text-[14px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Open
          </span>
        </div>
      </div>

      {/* ── footer ── */}
      <div className="px-5 pt-3.5 pb-[18px] border-t border-border flex items-center justify-between gap-2.5">
        {/* organizer */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 font-extrabold text-[#061008]"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9 }}
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
          <button
            disabled={isFull}
            className={cn(
              'rounded-full text-[13px] font-bold px-[22px] py-2.5 whitespace-nowrap transition-all',
              isFull
                ? 'bg-muted border border-border text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-[#061008] hover:opacity-[0.88] active:scale-[0.97]',
            )}
            style={!isFull ? { fontFamily: "'Space Grotesk', sans-serif" } : {}}
          >
            Join Game
          </button>
          <button className="text-[11px] text-primary font-medium flex items-center gap-1 hover:opacity-[0.72] transition-opacity">
            Invite <ExternalLink size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ delay = 0 }) {
  const s = `${delay}s`
  return (
    <div className="bg-card border border-border rounded-[20px] overflow-hidden animate-pulse" style={{ animationDelay: s }}>
      {/* head */}
      <div className="p-5 pb-[18px] space-y-3 bg-muted/20">
        <div className="flex justify-between">
          <div className="h-5 w-16 rounded-full bg-muted" style={{ animationDelay: s }} />
          <div className="h-5 w-14 rounded-full bg-muted" style={{ animationDelay: `${delay + 0.05}s` }} />
        </div>
        <div className="h-5 w-[62%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
        <div className="h-3.5 w-[48%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
      </div>
      {/* fill section */}
      <div className="px-5 pt-3.5 pb-3.5 border-t border-border space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-[55%] rounded bg-muted" />
          <div className="h-3 w-[30%] rounded bg-muted" />
        </div>
        <div className="h-[6px] rounded-full bg-muted" />
      </div>
      {/* body */}
      <div className="px-5 py-3.5 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-[55%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
          <div className="h-4 w-[40%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-[55%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
          <div className="h-4 w-[40%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
        </div>
      </div>
      {/* footer */}
      <div className="px-5 pb-5 pt-3.5 border-t border-border flex gap-3">
        <div className="h-9 flex-1 rounded-xl bg-muted" style={{ animationDelay: `${delay + 0.2}s` }} />
        <div className="h-9 flex-1 rounded-xl bg-muted" style={{ animationDelay: `${delay + 0.2}s` }} />
      </div>
    </div>
  )
}

// ── error / empty ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 flex items-center justify-between gap-4">
      <p className="text-sm text-red-400">{message}</p>
      <button onClick={onRetry} className="shrink-0 text-sm font-medium text-red-400 underline underline-offset-2">
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
                ? 'bg-primary text-[#061008] border-primary font-bold'
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

// ── page ──────────────────────────────────────────────────────────────────────

export default function FindGamePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSport = searchParams.get('sport') ?? ''
  const urlCity  = searchParams.get('city')  ?? ''
  const urlPage  = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const [refreshKey,  setRefreshKey]  = useState(0)
  const [statsResult, setStatsResult] = useState(null)
  const [result,      setResult]      = useState(null)
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState(null)

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
      .then(data => { if (!cancelled) setResult(data) })
      .catch(err  => { if (!cancelled) setError(parseApiError(err, 'Could not load matches.')) })
      .finally(()  => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [urlSport, urlCity, urlPage, refreshKey])

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

  return (
    <PageWrapper className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1296px] pt-[100px] pb-20 px-12">

        {/* Page header */}
        <div className="mb-9">
          <h1
            className="text-[40px] font-extrabold leading-none mb-2 text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-1px' }}
          >
            Find Open Games
          </h1>
          <p className="text-[16px] text-muted-foreground max-w-[540px] leading-relaxed">
            Join a match without organizing a full team — find a game with open spots and show up ready to play.
          </p>
        </div>

        {/* Stats banner */}
        <StatsBanner statsResult={statsResult} />

        {/* Filter bar */}
        <FilterBar
          statsResult={statsResult}
          filters={filters}
          setFilter={setFilter}
          clearAllFilters={clearAllFilters}
          totalCount={statsResult?.openGamesCount ?? null}
          resultCount={!isLoading && !error && result ? result.totalCount : null}
        />

        {/* Results */}
        <main>
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 0.1} />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />
          )}

          {!isLoading && !error && result?.items?.length === 0 && (
            <EmptyState hasFilters={hasActiveFilters} onClear={clearAllFilters} />
          )}

          {!isLoading && !error && result?.items?.length > 0 && (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${urlSport}-${urlCity}-${urlPage}`}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {result.items.map(m => (
                    <MatchCard key={m.matchId} match={m} />
                  ))}
                </motion.div>
              </AnimatePresence>

              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hasPrev={result.hasPreviousPage}
                hasNext={result.hasNextPage}
                onPrev={() => setPage(urlPage - 1)}
                onNext={() => setPage(urlPage + 1)}
                setPage={setPage}
              />
            </>
          )}
        </main>
      </div>
    </PageWrapper>
  )
}

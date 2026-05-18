import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/routing/PageWrapper'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '@/lib/motion'
import { listOpenMatches } from '../../services/Match/matchService'
import { getSportTypes, getCities } from '../../services/Lookup/lookupService'
import { parseApiError } from '../../utils/errorUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatMatchDateTime(bookingDate, startTime, endTime) {
  const date = new Date(bookingDate + 'T00:00:00')
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
}

// ── sub-components ────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white
                 focus:outline-none focus:ring-2 focus:ring-[var(--green)] transition"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map(o => (
        <option key={o.id ?? o.value ?? o} value={o.name ?? o.value ?? o}>
          {o.name ?? o.label ?? o}
        </option>
      ))}
    </select>
  )
}

function MatchCard({ match }) {
  const isFull      = match.acceptedCount >= match.maxPlayers
  const fillPct     = Math.min(100, Math.round((match.acceptedCount / match.maxPlayers) * 100))
  const barColour   = fillPct >= 80 ? 'bg-amber-400' : 'bg-[var(--green)]'
  const spotsLeft   = match.maxPlayers - match.acceptedCount

  return (
    <motion.div
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5
                 p-5 backdrop-blur-sm"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-white leading-snug line-clamp-2">
          {match.pitchName}
        </p>
        <span className="shrink-0 rounded-full bg-[var(--green)]/15 px-2 py-0.5
                         text-[10px] font-bold tracking-widest uppercase text-[var(--green)]">
          {match.sportName}
        </span>
      </div>

      {/* City */}
      <div className="flex items-center gap-1.5 text-sm text-[var(--text2)]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
             className="h-4 w-4 shrink-0">
          <path fillRule="evenodd"
            d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.387 1.445-.966 2.274-1.765C15.302 15.227 17 12.855 17 10a7 7 0 10-14 0c0 2.855 1.698 5.227 3.354 6.585a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.281.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
            clipRule="evenodd" />
        </svg>
        {match.cityName}
      </div>

      {/* Date/time */}
      <p className="text-sm text-[var(--text2)]">
        {formatMatchDateTime(match.bookingDate, match.startTime, match.endTime)}
      </p>

      {/* Spots indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-[var(--text2)]">
          <span>{match.acceptedCount} / {match.maxPlayers} players</span>
          <span>{isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full transition-all ${barColour}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}

function MatchesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[220px] rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4
                    flex items-center justify-between gap-4">
      <p className="text-sm text-red-400">{message}</p>
      <button onClick={onRetry}
              className="shrink-0 text-sm font-medium text-red-400 underline underline-offset-2">
        Retry
      </button>
    </div>
  )
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="mt-16 text-center space-y-3">
      <p className="text-2xl">🏟️</p>
      <p className="text-white font-semibold">No open matches found</p>
      {hasFilters ? (
        <p className="text-sm text-[var(--text2)]">
          Try different filters —{' '}
          <button onClick={onClear} className="underline underline-offset-2 text-[var(--green)]">
            clear all
          </button>
        </p>
      ) : (
        <p className="text-sm text-[var(--text2)]">
          No upcoming open matches right now. Check back later.
        </p>
      )}
    </div>
  )
}

function Pagination({ page, totalPages, hasPrev, hasNext, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white
                   disabled:opacity-30 hover:bg-white/5 transition"
      >
        ← Prev
      </button>
      <span className="text-sm text-[var(--text2)]">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white
                   disabled:opacity-30 hover:bg-white/5 transition"
      >
        Next →
      </button>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FindGamePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state is read entirely from the URL — makes the page bookmarkable
  // and ensures the browser Back button restores the previous filter state.
  const urlSport = searchParams.get('sport') ?? ''
  const urlCity  = searchParams.get('city')  ?? ''
  const urlPage  = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const [refreshKey, setRefreshKey] = useState(0)

  // Lookup data for dropdowns, loaded once on mount
  const [sportTypes,  setSportTypes]  = useState([])
  const [cities,      setCities]      = useState([])
  const [lookupError, setLookupError] = useState(null)

  // Match list result state
  const [result,    setResult]    = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  // Load dropdowns once
  useEffect(() => {
    Promise.all([getSportTypes(), getCities()])
      .then(([st, c]) => { setSportTypes(st); setCities(c) })
      .catch(err => {
        if (import.meta.env.DEV) console.error('Failed to load filter options:', err)
        setLookupError('Could not load filter options.')
      })
  }, [])

  // Fetch matches whenever URL-driven filters or the refresh key change
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listOpenMatches({ sport: urlSport, city: urlCity, page: urlPage, pageSize: 9 })
      .then(data  => { if (!cancelled) setResult(data) })
      .catch(err  => { if (!cancelled) setError(parseApiError(err, 'Could not load matches.')) })
      .finally(()  => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [urlSport, urlCity, urlPage, refreshKey])

  // Updates a single filter param and resets to page 1
  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else       next.delete(key)
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

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] text-[var(--text)]">

      {/* Page header */}
      <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-4">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-2">
          Find &amp; Join
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Find a Game
        </h1>
        <p className="text-sm text-[var(--text2)] mt-2">
          Browse upcoming open matches and join a team near you.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mx-auto max-w-[1280px] px-6 py-4 flex flex-wrap items-center gap-3">
        {lookupError && (
          <p className="text-xs text-red-400">{lookupError}</p>
        )}
        <FilterSelect
          label="All sports"
          value={urlSport}
          onChange={v => setFilter('sport', v)}
          options={sportTypes}
        />
        <FilterSelect
          label="All cities"
          value={urlCity}
          onChange={v => setFilter('city', v)}
          options={cities}
        />
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-[var(--text2)] underline underline-offset-2 hover:text-white transition"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results */}
      <main className="mx-auto max-w-[1280px] px-6 pb-20">

        {/* Total count */}
        {!isLoading && !error && result && (
          <p className="text-sm text-[var(--text2)] mb-2">
            {result.totalCount} {result.totalCount === 1 ? 'match' : 'matches'} found
          </p>
        )}

        {isLoading && <MatchesSkeleton />}

        {!isLoading && error && (
          <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />
        )}

        {!isLoading && !error && result?.items?.length === 0 && (
          <EmptyState hasFilters={hasActiveFilters} onClear={clearAllFilters} />
        )}

        {!isLoading && !error && result?.items?.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {result.items.map(m => (
                <MatchCard key={m.matchId} match={m} />
              ))}
            </motion.div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hasPrev={result.hasPreviousPage}
              hasNext={result.hasNextPage}
              onPrev={() => setPage(urlPage - 1)}
              onNext={() => setPage(urlPage + 1)}
            />
          </>
        )}
      </main>
    </PageWrapper>
  )
}

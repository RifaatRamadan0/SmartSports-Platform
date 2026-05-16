import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/routing/PageWrapper'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '@/lib/motion'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { listPitches } from '../../services/Pitch/pitchService'
import { getSportTypes, getCities } from '../../services/Lookup/lookupService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating_desc', label: 'Top rated' },
]

export default function PitchDiscoveryPage() {
  const navigate           = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filter state from URL so the page is bookmarkable.
  const urlSearch   = searchParams.get('search')   ?? ''
  const urlSport    = searchParams.get('sport')    ?? ''
  const urlCity     = searchParams.get('city')     ?? ''
  const rawMaxPrice = searchParams.get('maxPrice') ?? ''
  const urlMaxPrice = rawMaxPrice !== '' && Number(rawMaxPrice) > 0 ? rawMaxPrice : ''
  const rawSortBy   = searchParams.get('sortBy') ?? ''
  const urlSortBy   = SORT_OPTIONS.some(o => o.value === rawSortBy) ? rawSortBy : 'newest'
  const urlPage     = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const [refreshKey, setRefreshKey] = useState(0)

  // Local search input state — debounced before it reaches the URL.
  const [localSearch, setLocalSearch] = useState(urlSearch)
  const debounceRef = useRef(null)

  // Lookup data for dropdowns (loaded once).
  const [sportTypes,  setSportTypes]  = useState([])
  const [cities,      setCities]      = useState([])
  const [lookupError, setLookupError] = useState(null)

  // Pitch list result state.
  const [result,    setResult]    = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  // Keep the search input in sync if the URL param changes externally (e.g. back button).
  useEffect(() => { setLocalSearch(urlSearch) }, [urlSearch])

  // Load dropdowns on mount.
  useEffect(() => {
    Promise.all([getSportTypes(), getCities()])
      .then(([st, c]) => {
        setSportTypes(st)
        setCities(c)
      })
      .catch(err => {
        if (import.meta.env.DEV) console.error('Failed to load filter options:', err)
        setLookupError('Could not load filter options.')
      })
  }, [])

  // Clear the pending debounce on unmount to avoid a stale setSearchParams call.
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // Fetch pitches whenever any URL-driven filter changes.
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listPitches({
      search:   urlSearch,
      sport:    urlSport,
      city:     urlCity,
      maxPrice: urlMaxPrice,
      sortBy:   urlSortBy,
      page:     urlPage,
      pageSize: 12,
    })
      .then(data => { if (!cancelled) setResult(data) })
      .catch(err  => { if (!cancelled) setError(parseApiError(err, 'Could not load pitches.')) })
      .finally(()  => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [urlSearch, urlSport, urlCity, urlMaxPrice, urlSortBy, urlPage, refreshKey])

  // Helpers to mutate URL params.
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

  // Debounced search: keep input responsive, flush to URL after 400 ms.
  const handleSearchInput = (value) => {
    setLocalSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set('search', value)
        else       next.delete('search')
        next.set('page', '1')
        return next
      })
    }, 400)
  }

  const clearAllFilters = () => {
    clearTimeout(debounceRef.current)
    setLocalSearch('')
    setSearchParams({})
  }

  const hasActiveFilters = urlSearch || urlSport || urlCity || urlMaxPrice || (urlSortBy && urlSortBy !== 'newest')

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <DiscoveryNavbar />

      {/* Page header */}
      <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-4">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-2">
          Browse &amp; Book
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Find your pitch
        </h1>
        <p className="text-sm text-[var(--text2)] mt-2">
          Search, filter, and book sports facilities near you.
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        localSearch={localSearch}
        onSearchChange={handleSearchInput}
        sport={urlSport}
        onSportChange={v => setFilter('sport', v)}
        city={urlCity}
        onCityChange={v => setFilter('city', v)}
        maxPrice={urlMaxPrice}
        onMaxPriceChange={v => setFilter('maxPrice', Number(v) > 0 ? v : '')}
        sortBy={urlSortBy}
        onSortChange={v => setFilter('sortBy', v)}
        sportTypes={sportTypes}
        cities={cities}
        lookupError={lookupError}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
      />

      {/* Results */}
      <main className="mx-auto max-w-[1280px] px-6 pb-20">
        <ResultsMeta result={result} isLoading={isLoading} />

        {isLoading && <PitchesSkeleton />}

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
              {result.items.map(p => (
                <PitchCard key={p.id} pitch={p} onBook={() => handleBook(p, navigate)} />
              ))}
            </motion.div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hasPrev={result.hasPreviousPage}
              hasNext={result.hasNextPage}
              onPrev={() => setPage(result.page - 1)}
              onNext={() => setPage(result.page + 1)}
            />
          </>
        )}
      </main>

      <DiscoveryFooter />
    </PageWrapper>
  )
}

// Route a card click to the pitch detail page — auth and booking handled there.
function handleBook(pitch, navigate) {
  navigate(`/pitches/${pitch.id}`)
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function DiscoveryNavbar() {
  const navigate          = useNavigate()
  const { roles, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAuthenticated = roles.length > 0
  const isPlayer        = roles.includes(ROLES.PLAYER)
  const isOwner         = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin         = roles.includes(ROLES.ADMIN)

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => navigate('/pitches')} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-8 text-[13px] text-[var(--text2)]">
          <li>
            <button onClick={() => navigate('/pitches')} className="hover:text-white transition-colors text-[var(--green)] font-semibold">
              Pitches
            </button>
          </li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Leagues</button></li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Coaching</button></li>
        </ul>

        {/* Auth area */}
        <div className="flex items-center gap-2 relative">
          {!isAuthenticated && (
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

          {isAuthenticated && (
            <>
              {isPlayer && (
                <button
                  onClick={() => navigate('/my-bookings')}
                  className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
                >
                  My Bookings
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => navigate('/dashboard/bookings')}
                  className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
                >
                  Owner Dashboard
                </button>
              )}

              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
                aria-label="User menu"
                className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-[var(--bg2)] px-2 py-1.5 hover:border-[var(--green-border)] transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--green)] text-[var(--primary-foreground)] text-[12px] font-bold flex items-center justify-center">
                  {(roles[0] || 'U')[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline text-[12px] font-semibold pr-1">{roles[0] || 'User'}</span>
                <span className="text-[10px] text-[var(--text3)] pr-1">▾</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-12 w-52 rounded-xl border border-white/[0.07] bg-[var(--surface)] shadow-2xl py-2 text-[13px]"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">Signed in as</p>
                    <p className="text-white font-semibold mt-0.5">{roles.join(', ') || 'User'}</p>
                  </div>
                  {isPlayer && (
                    <button onClick={() => { setMenuOpen(false); navigate('/my-bookings') }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                      My Bookings
                    </button>
                  )}
                  {(isOwner || isAdmin) && (
                    <button onClick={() => { setMenuOpen(false); navigate('/dashboard/pitches') }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                      Manage Pitches
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => { setMenuOpen(false); navigate('/dashboard/bookings') }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                      Owner Dashboard
                    </button>
                  )}
                  {isPlayer && (
                    <button onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                      Home
                    </button>
                  )}
                  <button onClick={handleLogout}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--red-muted)] text-[var(--text2)] hover:text-[oklch(0.62_0.2_25)] transition-colors border-t border-white/[0.06] mt-1 pt-2">
                    Sign out
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  localSearch, onSearchChange,
  sport, onSportChange,
  city, onCityChange,
  maxPrice, onMaxPriceChange,
  sortBy, onSortChange,
  sportTypes, cities, lookupError,
  hasActiveFilters, onClearAll,
}) {
  return (
    <div className="sticky top-16 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-white/[0.06] py-3">
      <div className="mx-auto max-w-[1280px] px-6">
        {lookupError && (
          <p className="text-[11px] text-red-400 mb-2">{lookupError} Filters may be incomplete.</p>
        )}
        <div className="flex flex-wrap gap-2 items-center">

          {/* Text search */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs rounded-xl border border-white/[0.10] bg-[var(--surface)] px-3 py-2">
            <svg className="w-4 h-4 text-[var(--text3)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={localSearch}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search pitches…"
              className="bg-transparent outline-none text-sm text-white placeholder:text-[var(--text3)] w-full"
            />
            {localSearch && (
              <button onClick={() => onSearchChange('')} aria-label="Clear search" className="text-[var(--text3)] hover:text-white transition-colors text-xs">✕</button>
            )}
          </div>

          {/* Sport filter */}
          <FilterSelect
            value={sport}
            onChange={onSportChange}
            placeholder="All sports"
            options={sportTypes.map(s => ({ value: s.name, label: s.name }))}
          />

          {/* City filter */}
          <FilterSelect
            value={city}
            onChange={onCityChange}
            placeholder="All cities"
            options={cities.map(c => ({ value: c.name, label: c.name }))}
          />

          {/* Max price */}
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.10] bg-[var(--surface)] px-3 py-2 min-w-[130px]">
            <span className="text-[var(--text3)] text-xs shrink-0">Max $</span>
            <input
              type="number"
              min="1"
              value={maxPrice}
              onChange={e => onMaxPriceChange(e.target.value)}
              placeholder="Any"
              className="bg-transparent outline-none text-sm text-white placeholder:text-[var(--text3)] w-full min-w-0"
            />
          </div>

          {/* Sort */}
          <FilterSelect
            value={sortBy === 'newest' ? '' : sortBy}
            onChange={v => onSortChange(v || 'newest')}
            placeholder="Newest first"
            options={SORT_OPTIONS.filter(o => o.value !== 'newest').map(o => ({ value: o.value, label: o.label }))}
          />

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold text-[var(--text2)] hover:text-white border border-white/[0.08] hover:border-white/[0.20] transition-all"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="relative rounded-xl border border-white/[0.10] bg-[var(--surface)] overflow-hidden">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-transparent text-sm text-white px-3 py-2 pr-7 outline-none cursor-pointer min-w-[120px]"
        style={{ colorScheme: 'dark' }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text3)]">▾</span>
    </div>
  )
}

// ─── Results meta line ────────────────────────────────────────────────────────

function ResultsMeta({ result, isLoading }) {
  if (isLoading || !result) return <div className="h-8 mt-6" />
  return (
    <div className="mt-6 mb-4 flex items-center justify-between">
      <p className="text-sm text-[var(--text2)]">
        <span className="text-white font-semibold">{result.totalCount}</span>
        {' '}pitch{result.totalCount === 1 ? '' : 'es'} found
      </p>
      {result.totalPages > 1 && (
        <p className="text-xs text-[var(--text3)]">
          Page {result.page} of {result.totalPages}
        </p>
      )}
    </div>
  )
}

// ─── Pitch card ───────────────────────────────────────────────────────────────

function PitchCard({ pitch, onBook }) {
  const rating = pitch.rating != null ? Number(pitch.rating) : null
  const price  = Number(pitch.pricePerHour)

  return (
    <motion.button
      onClick={onBook}
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="group relative text-left rounded-3xl bg-[var(--surface)] border border-white/[0.06]
                 hover:border-[var(--green-border)] hover:bg-[var(--bg3)]
                 hover:shadow-[0_30px_60px_-30px_var(--green-glow)]
                 transition-colors duration-200 overflow-hidden flex flex-col"
    >
      {/* Cover image or sport SVG fallback */}
      <PitchCover imageUrl={pitch.coverImageUrl} sport={pitch.sportName} imageCount={pitch.imageCount} />

      {/* Sport badge */}
      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest
                       bg-black/40 backdrop-blur text-white border border-white/10">
        {pitch.sportName?.toUpperCase()}
      </span>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-white truncate">{pitch.name}</h3>
            {/* City shown under the name */}
            <p className="text-[12px] text-[var(--text2)] mt-0.5 truncate flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0 text-[var(--text3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              {pitch.cityName}
            </p>
          </div>
          {rating !== null && (
            <div className="flex items-center gap-1 text-[12px] shrink-0">
              <span className="text-yellow-400">★</span>
              <span className="text-white font-semibold">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between pt-4 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">From</p>
            <p className="text-xl font-bold text-white">
              <span className="text-[var(--text3)] text-sm align-top">$</span>
              {Number.isInteger(price) ? price : price.toFixed(2)}
              <span className="text-[var(--text3)] text-xs font-medium"> /hr</span>
            </p>
          </div>
          <span className="rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                           px-4 py-2 text-xs font-bold group-hover:brightness-110 transition-all">
            Book Now →
          </span>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, hasPrev, hasNext, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.10] text-sm font-semibold
                   text-[var(--text2)] hover:text-white hover:border-white/[0.25] transition-all
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Prev
      </button>

      <span className="text-sm text-[var(--text2)]">
        Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
      </span>

      <button
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.10] text-sm font-semibold
                   text-[var(--text2)] hover:text-white hover:border-white/[0.25] transition-all
                   disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PitchesSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-[320px] rounded-3xl border border-white/[0.06] bg-[var(--surface)]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-800/60 bg-[#1a0f0f] px-5 py-4 flex items-center gap-3 text-sm text-red-400">
      <span>✕</span>
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="text-xs underline underline-offset-2 hover:text-red-300">Retry</button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }) {
  return (
    <motion.div
      className="mt-6 rounded-2xl border border-white/[0.06] bg-[var(--surface)] py-20 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <span className="text-4xl floating inline-block">🏟️</span>
      <p className="mt-4 text-sm text-[var(--text2)]">
        {hasFilters ? 'No pitches match your filters.' : 'No pitches available yet. Check back soon.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-3 text-xs text-[var(--green)] underline underline-offset-4">
          Clear filters
        </button>
      )}
    </motion.div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function DiscoveryFooter() {
  const cols = [
    { title: 'Platform', links: ['Browse Pitches', 'Leagues', 'Coaching', 'Venues'] },
    { title: 'Company',  links: ['About', 'Careers', 'Press', 'Contact'] },
    { title: 'Support',  links: ['Help Centre', 'Cancellations', 'Privacy Policy', 'Terms'] },
  ]
  return (
    <footer className="border-t border-white/[0.06] bg-[var(--bg)]">
      <div className="mx-auto max-w-[1280px] px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
            <span className="text-sm font-bold tracking-tight text-white">SmartSports</span>
          </div>
          <p className="text-xs text-[var(--text2)] mt-3 leading-relaxed max-w-[220px]">
            The easiest way to book sports facilities in your city.
          </p>
        </div>
        {cols.map(col => (
          <div key={col.title}>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map(l => (
                <li key={l}>
                  <button type="button" className="text-[13px] text-[var(--text2)] opacity-60 cursor-not-allowed" disabled>{l}</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1280px] px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--text3)]">
          <p>© {new Date().getFullYear()} SmartSports Ltd.</p>
          <p>Built for the city.</p>
        </div>
      </div>
    </footer>
  )
}

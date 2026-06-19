import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/routing/PageWrapper'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '@/lib/motion'
import { listFavorites } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'
import FavoriteButton from '../../components/Pitch/FavoriteButton'

const PAGE_SIZE = 12

export default function FavoritesPage() {
  const navigate = useNavigate()

  const [page,      setPage]      = useState(1)
  const [result,    setResult]    = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listFavorites({ page, pageSize: PAGE_SIZE })
      setResult(data)
    } catch (err) {
      setError(parseApiError(err, 'Could not load your favorites.'))
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // When a pitch is un-favorited from this page, drop it from the list immediately.
  const handleUnfavorite = useCallback((pitchId, nowFavorited) => {
    if (nowFavorited) return
    setResult(prev => {
      if (!prev) return prev
      const items = prev.items.filter(p => p.id !== pitchId)
      return { ...prev, items, totalCount: Math.max(0, prev.totalCount - 1) }
    })
  }, [])

  const goToPitch = (pitch) => navigate(`/pitches/${pitch.id}`)

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-4">
        <button
          onClick={() => navigate('/pitches')}
          className="text-[12px] text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-5 flex items-center gap-1"
        >
          ← All pitches
        </button>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-2">
          Saved for later
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          My Favorites
        </h1>
        <p className="text-sm text-[var(--text2)] mt-2">
          The pitches you saved — ready to rebook in a tap.
        </p>
      </div>

      <main className="mx-auto max-w-[1280px] px-6 pb-20">
        {!isLoading && !error && result && (
          <p className="mt-6 mb-4 text-sm text-[var(--text2)]">
            <span className="text-white font-semibold">{result.totalCount}</span>
            {' '}saved pitch{result.totalCount === 1 ? '' : 'es'}
          </p>
        )}

        {isLoading && <FavoritesSkeleton />}

        {!isLoading && error && (
          <ErrorBanner message={error} onRetry={fetchFavorites} />
        )}

        {!isLoading && !error && result?.items?.length === 0 && <EmptyState navigate={navigate} />}

        {!isLoading && !error && result?.items?.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {result.items.map(p => (
                <PitchCard key={p.id} pitch={p} onOpen={() => goToPitch(p)} onFavoriteChange={handleUnfavorite} />
              ))}
            </motion.div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hasPrev={result.hasPreviousPage}
              hasNext={result.hasNextPage}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => p + 1)}
            />
          </>
        )}
      </main>
    </PageWrapper>
  )
}

// ─── Pitch card ───────────────────────────────────────────────────────────────

function PitchCard({ pitch, onOpen, onFavoriteChange }) {
  const rating = pitch.rating != null ? Number(pitch.rating) : null
  const price  = Number(pitch.pricePerHour)

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="group relative cursor-pointer text-left rounded-3xl bg-[var(--surface)] border border-white/[0.06]
                 hover:border-[var(--green-border)] hover:bg-[var(--bg3)]
                 hover:shadow-[0_30px_60px_-30px_var(--green-glow)]
                 transition-colors duration-200 overflow-hidden flex flex-col"
    >
      <PitchCover imageUrl={pitch.coverImageUrl} sport={pitch.sportName} imageCount={pitch.imageCount} />

      <div className="absolute top-3 left-3">
        <FavoriteButton
          pitchId={pitch.id}
          initialFavorited={pitch.isFavorited}
          onChange={next => onFavoriteChange(pitch.id, next)}
        />
      </div>

      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest
                       bg-black/40 backdrop-blur text-white border border-white/10">
        {pitch.sportName?.toUpperCase()}
      </span>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-white truncate">{pitch.name}</h3>
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
    </motion.div>
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

// ─── States ───────────────────────────────────────────────────────────────────

function FavoritesSkeleton() {
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

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-800/60 bg-[#1a0f0f] px-5 py-4 flex items-center gap-3 text-sm text-red-400">
      <span>✕</span>
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="text-xs underline underline-offset-2 hover:text-red-300">Retry</button>
    </div>
  )
}

function EmptyState({ navigate }) {
  return (
    <motion.div
      className="mt-6 rounded-2xl border border-white/[0.06] bg-[var(--surface)] py-20 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <span className="text-4xl floating inline-block">💚</span>
      <p className="mt-4 text-sm text-[var(--text2)]">
        You haven&apos;t saved any pitches yet.
      </p>
      <button onClick={() => navigate('/pitches')} className="mt-3 text-xs text-[var(--green)] underline underline-offset-4">
        Browse pitches
      </button>
    </motion.div>
  )
}

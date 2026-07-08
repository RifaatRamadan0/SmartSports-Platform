import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/routing/PageWrapper'
import { buttonHover, buttonTap } from '../../lib/motion'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getPitchById } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import ImageCarousel from '../../components/Pitch/ImageCarousel'
import WeeklySchedule from '../../components/Pitch/WeeklySchedule'
import ReviewCard from '../../components/Pitch/ReviewCard'
import StarRating from '../../components/ui/StarRating'
import FavoriteButton from '../../components/Pitch/FavoriteButton'
import Footer from '../../components/layout/Footer'

// Loading skeleton

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full h-72 sm:h-[420px] bg-[var(--surface)]" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="h-8 bg-[var(--surface)] rounded-lg w-2/3" />
        <div className="h-4 bg-[var(--surface)] rounded w-1/3" />
        <div className="h-24 bg-[var(--surface)] rounded-2xl" />
        <div className="h-4 bg-[var(--surface)] rounded w-1/4 mt-6" />
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-[var(--surface)] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Main page

export default function PitchDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { token, roles, isLoading: authLoading } = useAuth()

  const [pitch,   setPitch]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    getPitchById(id)
      .then(data => {
        if (!cancelled) {
          setPitch(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(parseApiError(err, 'Could not load pitch details.'))
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [id])

  const handleBookNow = () => {
    if (!token) {
      navigate('/login', { state: { from: `/pitches/${id}` } })
      return
    }
    if (roles.includes(ROLES.PLAYER)) {
      navigate(`/book/${id}`, {
        state: {
          pitchName:                 pitch.name,
          sport:                     pitch.sportTypeName,
          pricePerHour:              Number(pitch.pricePerHour),
          maxBookingDurationMinutes: pitch.maxBookingDurationMinutes,
          rating:                    pitch.rating != null ? Number(pitch.rating) : undefined,
          currency:                  '$',
        },
      })
      return
    }
    navigate('/dashboard')
  }

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] text-[var(--text)]">

      {loading && <DetailSkeleton />}

      {!loading && error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="text-sm text-[var(--text2)] mb-4">{error}</p>
          <button
            onClick={() => navigate('/pitches')}
            className="text-sm text-[var(--green)] underline underline-offset-4"
          >
            ← Back to pitches
          </button>
        </div>
      )}

      {!loading && !error && pitch && (
        <>
          <ImageCarousel images={pitch.images ?? []} />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

            {/* Breadcrumb */}
            <button
              onClick={() => navigate('/pitches')}
              className="text-[12px] text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-5 flex items-center gap-1"
            >
              ← All pitches
            </button>

            {/* Title + badges */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {pitch.name}
                </h1>
                <FavoriteButton pitchId={pitch.id} initialFavorited={pitch.isFavorited} size="lg" className="shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center rounded-full border border-[var(--green-border)] bg-[var(--green)]/10
                                 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--green)] tracking-wide">
                  {pitch.sportTypeName}
                </span>
                <span className="text-[var(--text3)] text-xs">·</span>
                <span className="text-sm text-[var(--text2)]">{pitch.cityName}</span>
                <span className="text-[var(--text3)] text-xs">·</span>
                <span className="text-sm text-[var(--text2)]">{pitch.address}</span>
              </div>
            </div>

            {/* Price + rating + Book Now */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10
                            p-5 rounded-2xl border border-white/[0.07] bg-[var(--surface)]">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">
                    Price per hour
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${Number(pitch.pricePerHour).toFixed(2)}
                    <span className="text-sm font-normal text-[var(--text2)]"> / hr</span>
                  </p>
                </div>

                {pitch.rating != null && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">
                      Rating
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating value={pitch.rating} />
                      <span className="text-sm font-semibold text-white">
                        {Number(pitch.rating).toFixed(1)}
                      </span>
                      {pitch.ratingCount > 0 && (
                        <span className="text-sm text-[var(--text3)]">
                          ({pitch.ratingCount})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                onClick={handleBookNow}
                disabled={authLoading}
                whileHover={buttonHover}
                whileTap={buttonTap}
                className="shimmer-btn rounded-full px-7 py-3 text-[13px] font-bold
                           text-[var(--primary-foreground)] shadow-[0_4px_16px_var(--green-glow)]
                           disabled:opacity-50"
              >
                Book Now
              </motion.button>
            </div>

            {/* Weekly schedule */}
            <section className="mb-10">
              <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-3">
                Weekly Schedule
              </h2>
              <WeeklySchedule schedule={pitch.schedule ?? []} />
            </section>

            {/* Reviews */}
            <section className="mb-10">
              <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-3">
                {pitch.recentReviews?.length > 0
                  ? `Recent Reviews (${pitch.recentReviews.length})`
                  : 'Reviews'}
              </h2>
              {pitch.recentReviews?.length > 0 ? (
                <div className="space-y-3">
                  {pitch.recentReviews.map(r => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] py-10 text-center">
                  <p className="text-sm text-[var(--text3)]">No reviews yet. Be the first to book and review.</p>
                </div>
              )}
            </section>

          </div>
        </>
      )}

      <Footer />
    </PageWrapper>
  )
}

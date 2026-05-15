import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/routing/PageWrapper'
import { buttonHover, buttonTap } from '../../lib/motion'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getPitchById } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(timeSpan) {
  return timeSpan ? timeSpan.substring(0, 5) : ''
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Image carousel

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0)
  const count = images.length

  if (count === 0) {
    return (
      <div className="w-full h-72 sm:h-[420px] bg-[var(--surface)] flex items-center justify-center">
        <svg className="w-16 h-16 text-[var(--text3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path strokeLinecap="round" d="m21 15-5-5L5 21" />
        </svg>
      </div>
    )
  }

  const prev = () => setIdx(i => (i - 1 + count) % count)
  const next = () => setIdx(i => (i + 1) % count)

  return (
    <div className="relative w-full h-72 sm:h-[420px] bg-[var(--surface)] overflow-hidden group">
      <img
        src={images[idx]}
        alt={`Pitch image ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {count > 1 && (
        <>
          {/* Prev / Next */}
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70
                       flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70
                       flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ›
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === idx ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="absolute top-3 right-3 text-[11px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5">
            {idx + 1} / {count}
          </span>
        </>
      )}
    </div>
  )
}

// Star rating 

function StarRating({ value }) {
  const rounded = Math.round(value ?? 0)
  return (
    <span className="flex items-center gap-0.5 text-base leading-none">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rounded ? 'text-yellow-400' : 'text-[var(--text3)]'}>
          ★
        </span>
      ))}
    </span>
  )
}

// Weekly schedule 

function WeeklySchedule({ schedule }) {
  const slotMap = Object.fromEntries(schedule.map(s => [s.dayOfWeek, s]))

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[var(--surface)] overflow-hidden">
      {DAY_NAMES.map((day, i) => {
        const slot = slotMap[i]
        const open = slot?.isActive

        return (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.05] last:border-b-0 ${
              open ? '' : 'opacity-40'
            }`}
          >
            <span className={`text-sm font-medium ${open ? 'text-white' : 'text-[var(--text2)]'}`}>
              {day}
            </span>
            {open ? (
              <span className="text-sm text-[var(--green)] font-medium tabular-nums">
                {formatTime(slot.openTime)} – {formatTime(slot.closeTime)}
              </span>
            ) : (
              <span className="text-sm text-[var(--text3)]">Closed</span>
            )}
          </div>
        )
      })}
      {schedule.length === 0 && (
        <p className="px-4 py-6 text-sm text-[var(--text3)] text-center">No schedule published yet.</p>
      )}
    </div>
  )
}

// Review card

function ReviewCard({ review }) {
  const initial = review.reviewerName ? review.reviewerName[0].toUpperCase() : '?'

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center
                          text-xs font-bold text-[var(--primary-foreground)] shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{review.reviewerName}</p>
            <p className="text-[11px] text-[var(--text3)] mt-0.5">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-3 text-sm text-[var(--text2)] leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

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
      <DetailNavbar />

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
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {pitch.name}
              </h1>
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

      <DetailFooter />
    </PageWrapper>
  )
}

// Navbar

function DetailNavbar() {
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

        <button onClick={() => navigate('/pitches')} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        <ul className="hidden md:flex items-center gap-8 text-[13px] text-[var(--text2)]">
          <li>
            <button onClick={() => navigate('/pitches')} className="hover:text-white transition-colors text-[var(--green)] font-semibold">
              Pitches
            </button>
          </li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Leagues</button></li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Coaching</button></li>
        </ul>

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
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => navigate('/dashboard/owner')}
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
                    <>
                      <button onClick={() => { setMenuOpen(false); navigate('/dashboard/pitches') }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                        Manage Pitches
                      </button>
                      <button onClick={() => { setMenuOpen(false); navigate('/dashboard/owner') }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors">
                        Owner Dashboard
                      </button>
                    </>
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

// Footer

function DetailFooter() {
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

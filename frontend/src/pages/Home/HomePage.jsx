import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cardVariants, cardHover, cardTap, listContainerVariants } from '../../lib/motion'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getRoleHomePath } from '../../utils/roleUtils'
import { listPitches } from '../../services/Pitch/pitchService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'

const SPORT_FILTERS = ['All', 'Football', 'Futsal', 'Basketball', 'Tennis']

export default function HomePage() {
  const navigate   = useNavigate()
  const pitchesRef = useRef(null)
  const { roles }  = useAuth()
  const isPlayer   = roles.includes(ROLES.PLAYER)

  const [activeSport, setActiveSport] = useState('All')
  const [pitches,     setPitches]     = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState(null)

  const fetchPitches = useCallback(async (sport) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listPitches({ sport, pageSize: 12 })
      setPitches(data.items ?? [])
    } catch (err) {
      setError(parseApiError(err, 'Could not load pitches.'))
      setPitches([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPitches(activeSport) }, [activeSport, fetchPitches])

  const scrollToPitches = () => {
    pitchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goToPitch = (pitch) => {
    if (isPlayer) {
      navigate(`/book/${pitch.id}`, {
        state: {
          pitchName:                 pitch.name,
          sport:                     pitch.sportName,
          pricePerHour:              Number(pitch.pricePerHour),
          maxBookingDurationMinutes: pitch.maxBookingDurationMinutes,
          rating:                    pitch.rating != null ? Number(pitch.rating) : undefined,
          currency:                  '$',
        },
      })
    } else {
      navigate(`/pitches/${pitch.id}`)
    }
  }

  const goToDetail = (pitch) => navigate(`/pitches/${pitch.id}`)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <Hero onBrowse={scrollToPitches} />
      <SearchBar />
      <PitchesSection
        sectionRef={pitchesRef}
        filters={SPORT_FILTERS}
        active={activeSport}
        onFilter={setActiveSport}
        pitches={pitches}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchPitches(activeSport)}
        onSelect={goToPitch}
        onDetail={goToDetail}
        canBook={isPlayer}
      />
      <HowItWorksSection />
      <Footer />
    </div>
  )
}

// Navbar

function Navbar() {
  const navigate = useNavigate()
  const { roles, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isPlayer = roles.includes(ROLES.PLAYER)
  const isOwner  = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin  = roles.includes(ROLES.ADMIN)

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(getRoleHomePath(roles))}
          className="flex items-center gap-2 group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        <ul className="hidden md:flex items-center gap-8 text-[13px] text-[var(--text2)]">
          <li><a href="#pitches" className="hover:text-white transition-colors">Pitches</a></li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Leagues</button></li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Coaching</button></li>
          <li><button type="button" className="hover:text-white transition-colors opacity-50 cursor-not-allowed" disabled>Venues</button></li>
        </ul>

        <div className="flex items-center gap-2 relative">
          {isPlayer && (
            <button
              onClick={() => navigate('/my-bookings')}
              className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
            >
              My Bookings
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => navigate('/dashboard/pitches')}
                className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
              >
                My Pitches
              </button>
              <button
                onClick={() => navigate('/dashboard/bookings')}
                className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
              >
                Owner Dashboard
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/pitches')}
              className="hidden sm:inline-flex text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
            >
              Pitch Approvals
            </button>
          )}

          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            aria-label="User menu"
            className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-[var(--bg2)] px-2 py-1.5 hover:border-[var(--green-border)] transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-[var(--green)] text-[var(--primary-foreground)] text-[12px] font-bold flex items-center justify-center">
              {(roles[0] || 'U')[0].toUpperCase()}
            </span>
            <span className="hidden sm:inline text-[12px] font-semibold pr-1">
              {roles[0] || 'User'}
            </span>
            <span className="text-[10px] text-[var(--text3)] pr-1">▾</span>
          </button>

          {menuOpen && (
            <div
              id="user-menu"
              role="menu"
              className="absolute right-0 top-12 w-52 rounded-xl border border-white/[0.07] bg-[var(--surface)] shadow-2xl py-2 text-[13px]"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">Signed in as</p>
                <p className="text-white font-semibold mt-0.5">{roles.join(', ') || 'User'}</p>
              </div>
              {isPlayer && (
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => { setMenuOpen(false); navigate('/my-bookings') }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors"
                >
                  My Bookings
                </motion.button>
              )}
              {isOwner && (
                <>
                  <motion.button
                    whileHover={{ x: 3 }}
                    onClick={() => { setMenuOpen(false); navigate('/dashboard/pitches') }}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors"
                  >
                    My Pitches
                  </motion.button>
                  <motion.button
                    whileHover={{ x: 3 }}
                    onClick={() => { setMenuOpen(false); navigate('/dashboard/bookings') }}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors"
                  >
                    Owner Dashboard
                  </motion.button>
                </>
              )}
              {isAdmin && (
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => { setMenuOpen(false); navigate('/admin/pitches') }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors"
                >
                  Pitch Approvals
                </motion.button>
              )}
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-white transition-colors"
              >
                Settings
              </motion.button>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 hover:bg-[var(--red-muted)] text-[var(--text2)] hover:text-[oklch(0.62_0.2_25)] transition-colors border-t border-white/[0.06] mt-1 pt-2"
              >
                Sign out
              </motion.button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

// Hero

function Hero({ onBrowse }) {
  const { roles } = useAuth()
  const navigate  = useNavigate()
  const isPlayer  = roles.includes(ROLES.PLAYER)
  const isAdmin   = roles.includes(ROLES.ADMIN)

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 80% -10%, oklch(0.68 0.22 145 / 0.28), transparent 60%), radial-gradient(ellipse 40% 30% at 10% 20%, oklch(0.68 0.22 145 / 0.10), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent 80%)',
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-5">
          Real-time pitch booking
        </p>

        <h1
          className="font-bold tracking-tight text-white"
          style={{
            fontSize: 'clamp(44px, 7vw, 96px)',
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
          }}
        >
          Your pitch,
          <br />
          <span className="text-[var(--green)]">booked in seconds.</span>
        </h1>

        <p className="mt-6 max-w-xl text-[15px] sm:text-base text-[var(--text2)] leading-relaxed">
          Browse and book sports pitches across your city. Real-time availability,
          instant confirmation, no phone calls.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onBrowse}
            className="rounded-full bg-[var(--green)] px-6 py-3 text-[14px] font-bold text-[var(--primary-foreground)]
                       shadow-[0_8px_24px_var(--green-glow)] hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            Browse Pitches
          </button>
          <button
            onClick={() => navigate(isPlayer ? '/my-bookings' : isAdmin ? '/admin/pitches' : '/dashboard/pitches')}
            className="rounded-full border border-white/[0.10] bg-white/[0.02] px-6 py-3 text-[14px] font-semibold
                       text-[var(--text)] hover:bg-white/[0.05] hover:border-white/[0.20] transition-all"
          >
            {isPlayer ? 'My Bookings' : isAdmin ? 'Pitch Approvals' : 'Manage Pitches'}
          </button>
        </div>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/[0.06] max-w-2xl">
          <Stat label="Pitches" value="Live" />
          <Stat label="Sports" value="6" />
          <Stat label="Avg. confirm" value="< 4s" />
          <Stat label="Bookable" value="30 days" />
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-[var(--bg)] px-5 py-4">
      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text3)]">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

// Search bar (visual placeholder; real filtering happens on the pitches grid)

function SearchBar() {
  return (
    <section className="relative -mt-8 px-6 pb-12">
      <div className="mx-auto max-w-[1080px] rounded-2xl border border-white/[0.07] bg-[var(--surface)] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-stretch">
          <SearchField className="sm:col-span-5" label="Pitch or location" placeholder="e.g. Arena North or Camden" />
          <SearchField className="sm:col-span-3" label="Sport" placeholder="Any sport" />
          <SearchField className="sm:col-span-2" label="Date" placeholder="Today" />
          <a
            href="#pitches"
            className="sm:col-span-2 m-1 rounded-xl bg-[var(--green)] text-[var(--primary-foreground)] font-bold text-sm
                       hover:brightness-110 active:scale-[0.98] transition-all min-h-[56px] flex items-center justify-center"
          >
            Search
          </a>
        </div>
      </div>
    </section>
  )
}

function SearchField({ className = '', label, placeholder }) {
  const id = `search-field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className={`px-4 py-3 rounded-xl hover:bg-[var(--bg3)] transition-colors ${className}`}>
      <label
        htmlFor={id}
        className="text-[10px] font-bold tracking-widest uppercase text-(--text3)"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent border-0 outline-none text-sm text-white placeholder:text-[var(--text3)]"
      />
    </div>
  )
}

// Pitches section

function PitchesSection({
  sectionRef, filters, active, onFilter, pitches, isLoading, error, onRetry, onSelect, onDetail, canBook,
}) {
  return (
    <section ref={sectionRef} id="pitches" className="px-6 py-16 sm:py-20 scroll-mt-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-2">
              Available Now
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Featured pitches
            </h2>
            <p className="text-sm text-[var(--text2)] mt-2">
              {isLoading
                ? 'Loading pitches…'
                : `${pitches.length} pitch${pitches.length === 1 ? '' : 'es'} ready to book today.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map(label => {
              const isActive = label === active
              return (
                <button
                  key={label}
                  onClick={() => onFilter(label)}
                  className={`px-4 py-2 rounded-full text-[12px] font-bold border transition-all
                    ${isActive
                      ? 'bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]'
                      : 'border-white/[0.08] text-[var(--text2)] hover:text-white hover:border-white/[0.20]'
                    }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading && <PitchesSkeleton />}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-800/60 bg-[#1a0f0f] px-5 py-4 flex items-center gap-3 text-sm text-red-400">
            <span>✕</span>
            <span className="flex-1">{error}</span>
            <button
              onClick={onRetry}
              className="text-xs underline underline-offset-2 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && pitches.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] py-16 text-center">
            <p className="text-sm text-[var(--text2)]">
              {active === 'All'
                ? 'No pitches available yet. Check back soon.'
                : `No ${active} pitches available right now.`}
            </p>
            {active !== 'All' && (
              <button
                onClick={() => onFilter('All')}
                className="mt-3 text-xs text-[var(--green)] underline underline-offset-4"
              >
                See all sports
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && pitches.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {pitches.map(p => (
              <PitchCard key={p.id} pitch={p} onClick={() => onSelect(p)} onDetail={() => onDetail(p)} canBook={canBook} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

function PitchesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-[300px] rounded-3xl border border-white/[0.06] bg-[var(--surface)]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

function PitchCard({ pitch, onClick, onDetail, canBook }) {
  const rating  = pitch.rating != null ? Number(pitch.rating) : null
  const price   = Number(pitch.pricePerHour)

  const handleDetail = (e) => {
    e.stopPropagation()
    onDetail()
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="group relative text-left rounded-3xl bg-[var(--surface)] border border-white/[0.06]
                 hover:border-[var(--green-border)] hover:bg-[var(--bg3)]
                 hover:shadow-[0_30px_60px_-30px_var(--green-glow)]
                 transition-colors duration-200 overflow-hidden flex flex-col"
    >
      <button onClick={handleDetail} className="block w-full text-left focus:outline-none">
        <PitchCover imageUrl={pitch.coverImageUrl} sport={pitch.sportName} imageCount={pitch.imageCount} className="h-40" />
      </button>

      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest
                       bg-black/40 backdrop-blur text-white border border-white/10">
        {pitch.sportName?.toUpperCase()}
      </span>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              onClick={handleDetail}
              className="text-[17px] font-bold text-white truncate block w-full text-left
                         hover:text-[var(--green)] transition-colors focus:outline-none"
            >
              {pitch.name}
            </button>
            <p className="text-[12px] text-[var(--text2)] mt-0.5 truncate">
              {pitch.address || pitch.sportName}
            </p>
          </div>
          {rating !== null && (
            <div className="flex items-center gap-1 text-[12px] text-[var(--text2)] shrink-0">
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
          <button
            onClick={onClick}
            className="rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                       px-4 py-2 text-xs font-bold hover:brightness-110 transition-all"
          >
            {canBook ? 'Book Now →' : 'View Details →'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// How it works

function HowItWorksSection() {
  const steps = [
    { n: 1, title: 'Find your pitch',  body: 'Browse pitches by sport. Filter by what matters to you.' },
    { n: 2, title: 'Pick a time',      body: 'Real-time availability for the next 30 days. 30-minute slots, no double-bookings.' },
    { n: 3, title: 'Confirm and play', body: 'Instant confirmation, secure your slot in seconds. We handle the rest.' },
  ]
  return (
    <section className="px-6 py-16 sm:py-24 border-t border-white/[0.05] bg-[var(--bg2)]/40">
      <div className="mx-auto max-w-[1080px] text-center">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-2">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Three steps. No phone calls.
        </h2>
        <p className="text-sm text-[var(--text2)] mt-3 max-w-xl mx-auto">
          Skip the back-and-forth. Find a pitch, pick a slot, you're playing the same day.
        </p>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          {steps.map(s => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-6 hover:border-[var(--green-border)] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--green-muted)] border border-[var(--green-border)] text-[var(--green)] font-bold text-sm flex items-center justify-center">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--text2)] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Footer

function Footer() {
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
                  <button
                    type="button"
                    className="text-[13px] text-(--text2) hover:text-white transition-colors opacity-60 cursor-not-allowed"
                    disabled
                  >
                    {l}
                  </button>
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

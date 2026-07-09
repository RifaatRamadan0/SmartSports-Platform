import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '../../lib/motion'
import { inviteByUsername } from '../../services/Invitation/invitationService'
import { getMatchById } from '../../services/Match/matchService'
import { parseApiError } from '../../utils/errorUtils'
import Toast from '../../components/ui/Toast'

// SPDBTCP-76 — Rifaat
// Participant invite UI. Any accepted participant (including the booking owner)
// can dispatch invitations by username. Joined-players list and pitch metadata
// are deferred to later sprint-5 stories.
export default function MatchDetailPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()

  // SPDBTCP-83 — Existence guard. We don't render the page shell until we know
  // the match exists, so a deep-link to a deleted/typo'd id falls through to
  // the catch-all NotFoundPage instead of showing an invite form for nothing.
  const [isCheckingMatch, setIsCheckingMatch] = useState(true)
  const [match, setMatch] = useState(null)
  const [toast, setToast] = useState(null)
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function verifyMatchExists() {
      try {
        const fetchedMatch = await getMatchById(matchId)
        if (cancelled) return
        if (fetchedMatch === null) { navigate('/404', { replace: true }); return }
        setMatch(fetchedMatch)
        setIsCheckingMatch(false)
      } catch (err) {
        if (cancelled) return
        if (err?.response?.status === 404) {
          navigate('/404', { replace: true })
          return
        }
        setToast({ message: parseApiError(err, 'Could not load match details.'), type: 'error' })
        setIsCheckingMatch(false)
      }
    }
    verifyMatchExists()
    return () => { cancelled = true }
  }, [matchId, navigate])

  const showToast = (message, type = 'success') => setToast({ message, type })

  const handleInvite = async (e) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      const res = await inviteByUsername(matchId, trimmed)
      showToast(`Invitation sent to ${res.invitedUsername}.`)
      setUsername('')
    } catch (err) {
      showToast(parseApiError(err, 'Could not send invitation.'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingMatch) {
    return <div className="min-h-screen bg-[var(--bg)]" aria-busy="true" />
  }

  const isCancelled = match?.bookingStatus === 'cancelled'

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white"
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/my-bookings')}
          className="text-[13px] font-semibold text-[var(--text2)] hover:text-white transition-colors mb-10"
        >
          ← Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
          className="mb-8"
        >
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-1">Match</p>
          <h1 className="text-3xl font-bold tracking-tight">
            #{String(matchId).padStart(6, '0')}
          </h1>
        </motion.div>

        {isCancelled ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            className="rounded-2xl border border-[var(--red)]/20 bg-[var(--red)]/5 px-5 py-4 mb-4"
          >
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--red)]/70 mb-1">
              Booking cancelled
            </p>
            <p className="text-[13px] text-[var(--red)]">
              This match's booking was cancelled. Invitations and joins are no longer possible.
            </p>
          </motion.div>
        ) : (
          /* Invite by username */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            className="rounded-2xl border border-white/6 bg-[var(--surface)] p-5 mb-4"
          >
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text2)] mb-3">
              Invite a player
            </p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                minLength={3}
                maxLength={50}
                required
                className="flex-1 rounded-xl border border-[#2a2a2a] bg-[var(--bg)] px-4 py-3
                           text-[13px] text-white placeholder-neutral-600
                           focus:outline-none focus:border-[var(--green)]/50"
              />
              <button
                type="submit"
                disabled={isSubmitting || username.trim().length < 3}
                className="px-5 py-3 rounded-xl text-[13px] font-bold
                           bg-[var(--green)]/20 border border-[var(--green)]/40 text-[var(--green)]
                           hover:bg-[var(--green)]/30 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Sending…' : 'Invite'}
              </button>
            </form>
            <p className="text-[11px] text-[var(--text3)] mt-3">
              Anyone already in this match can send invitations. The invitee will see it in their inbox.
            </p>
          </motion.div>
        )}

        {/* Participants placeholder — wired in later sprint-5 stories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
          className="rounded-2xl border border-dashed border-white/5 px-5 py-4"
        >
          <p className="text-[11px] text-[var(--text3)]">
            Coming soon: joined players · open/private toggle · shareable link
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}



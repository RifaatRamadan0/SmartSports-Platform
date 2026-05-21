import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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

  useEffect(() => {
    let cancelled = false
    async function verifyMatchExists() {
      const match = await getMatchById(matchId)
      if (cancelled) return
      if (match === null) { navigate('/404', { replace: true }); return }
      setIsCheckingMatch(false)
    }
    verifyMatchExists()
    return () => { cancelled = true }
  }, [matchId, navigate])

  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

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
    return <div className="min-h-screen bg-[#080808]" aria-busy="true" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-[#080808] px-6 py-10 text-white"
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
          className="text-[13px] font-semibold text-neutral-400 hover:text-white transition-colors mb-10"
        >
          ← Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
          className="mb-8"
        >
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-green-500 mb-1">Match</p>
          <h1 className="text-3xl font-bold tracking-tight">
            #{String(matchId).padStart(6, '0')}
          </h1>
        </motion.div>

        {/* Invite by username */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="rounded-2xl border border-white/6 bg-[#0d0d0d] p-5 mb-4"
        >
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 mb-3">
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
              className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#080808] px-4 py-3
                         text-[13px] text-white placeholder-neutral-600
                         focus:outline-none focus:border-green-500/50"
            />
            <button
              type="submit"
              disabled={isSubmitting || username.trim().length < 3}
              className="px-5 py-3 rounded-xl text-[13px] font-bold
                         bg-green-500/20 border border-green-500/40 text-green-400
                         hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Invite'}
            </button>
          </form>
          <p className="text-[11px] text-neutral-600 mt-3">
            Anyone already in this match can send invitations. The invitee will see it in their inbox.
          </p>
        </motion.div>

        {/* Participants placeholder — wired in later sprint-5 stories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
          className="rounded-2xl border border-dashed border-white/5 px-5 py-4"
        >
          <p className="text-[11px] text-neutral-600">
            Coming soon: joined players · open/private toggle · shareable link
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

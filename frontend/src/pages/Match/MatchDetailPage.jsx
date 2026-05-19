import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { inviteByUsername } from '../../services/Invitation/invitationService'
import { parseApiError } from '../../utils/errorUtils'

// SPDBTCP-76 — Rifaat
// Owner-only invite UI. Pulling the joined-players list and pitch metadata is
// deferred to later sprint-5 stories; this page exists so the booking owner
// can dispatch invitations by username.
export default function MatchDetailPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Hold the auto-dismiss handle so we can (a) cancel a stale timer when a new
  // toast arrives, and (b) clean up on unmount — otherwise a setTimeout outliving
  // the component would fire setToast on an unmounted instance.
  const toastTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

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

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
          rounded-xl shadow-2xl border text-sm font-medium
          ${toast.type === 'success'
            ? 'bg-[#0f1a12] border-green-600 text-green-400'
            : 'bg-[#1a0f0f] border-red-600 text-red-400'}`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-[13px] font-semibold text-neutral-400 hover:text-white transition-colors mb-10"
        >
          ← Back
        </button>

        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-green-500 mb-1">Match</p>
          <h1 className="text-3xl font-bold tracking-tight">
            #{String(matchId).padStart(6, '0')}
          </h1>
        </div>

        {/* Invite by username */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-5 mb-4">
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
        </div>

        {/* Participants placeholder — wired in later sprint-5 stories */}
        <div className="rounded-2xl border border-dashed border-white/[0.05] px-5 py-4">
          <p className="text-[11px] text-neutral-600">
            Coming soon: joined players · open/private toggle · shareable link
          </p>
        </div>
      </div>
    </div>
  )
}

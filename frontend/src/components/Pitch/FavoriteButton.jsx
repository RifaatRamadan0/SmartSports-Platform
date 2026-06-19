import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { toggleFavorite } from '../../services/Pitch/pitchService'

// Heart toggle for saving a pitch. Rendered only for authenticated players;
// guests, owners, and admins see nothing. Updates optimistically and reverts on error.
//
// Props:
//   pitchId          - id of the pitch to favorite
//   initialFavorited - server-provided isFavorited flag
//   onChange         - optional (next: boolean) => void, fired after a successful toggle
//   size             - 'sm' (default) | 'lg'
export default function FavoriteButton({ pitchId, initialFavorited = false, onChange, size = 'sm', className = '' }) {
  const { roles } = useAuth()
  const isPlayer  = roles.includes(ROLES.PLAYER)

  const [favorited, setFavorited] = useState(initialFavorited)
  const [busy,      setBusy]      = useState(false)

  if (!isPlayer) return null

  const handleClick = async (e) => {
    // Don't let the click bubble to a surrounding card/link.
    e.stopPropagation()
    e.preventDefault()
    if (busy) return

    const next = !favorited
    setFavorited(next)
    setBusy(true)
    try {
      const result = await toggleFavorite(pitchId)
      setFavorited(result)
      onChange?.(result)
    } catch (err) {
      setFavorited(!next) // revert
      if (import.meta.env.DEV) console.error('Failed to toggle favorite:', err)
    } finally {
      setBusy(false)
    }
  }

  const box  = size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
  const icon = size === 'lg' ? 'w-6 h-6'  : 'w-5 h-5'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`${box} inline-flex items-center justify-center rounded-full border
                  border-white/10 bg-black/40 backdrop-blur transition-all
                  hover:border-[var(--green-border)] hover:scale-105
                  disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <svg
        className={`${icon} transition-colors ${favorited ? 'text-[oklch(0.62_0.2_25)]' : 'text-white'}`}
        viewBox="0 0 24 24"
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-7.5-4.6-10-9.3C.7 9 1.7 5.5 4.8 4.6 7 4 9.1 5 12 8c2.9-3 5-4 7.2-3.4 3.1.9 4.1 4.4 2.8 7.1C19.5 16.4 12 21 12 21z"
        />
      </svg>
    </button>
  )
}

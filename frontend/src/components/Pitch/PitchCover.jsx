import { useState } from 'react'

export default function PitchCover({ imageUrl, sport, className = 'h-44' }) {
  const [imgError, setImgError] = useState(false)

  if (imageUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-[var(--bg2)] ${className}`}>
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  return <SportThumbnail sport={sport} className={className} />
}

function SportThumbnail({ sport, className }) {
  const s = (sport || '').toLowerCase()
  return (
    <div className={`relative bg-gradient-to-br from-[oklch(0.32_0.12_145)] to-[oklch(0.20_0.08_145)] flex items-center justify-center ${className}`}>
      {s.includes('football') || s.includes('futsal') || s.includes('soccer') ? (
        <svg viewBox="0 0 200 120" className="w-2/3 h-2/3 text-[oklch(0.55_0.18_145)]">
          <rect x="4" y="4" width="192" height="112" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="100" y1="4" x2="100" y2="116" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="60" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="36" width="20" height="48" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="176" y="36" width="20" height="48" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : s.includes('basket') ? (
        <svg viewBox="0 0 200 120" className="w-2/3 h-2/3 text-[oklch(0.55_0.18_145)]">
          <rect x="4" y="4" width="192" height="112" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="100" y1="4" x2="100" y2="116" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="60" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M4 30 H40 V90 H4 Z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M196 30 H160 V90 H196 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg viewBox="0 0 200 120" className="w-2/3 h-2/3 text-[oklch(0.55_0.18_145)]">
          <rect x="10" y="10" width="180" height="100" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="100" y1="10" x2="100" y2="110" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="60" x2="190" y2="60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
        </svg>
      )}
    </div>
  )
}

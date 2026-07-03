import { useState, useEffect, useCallback } from 'react'

export default function GalleryModal({ images, onClose, title, initialIndex = 0 }) {
  const [idx, setIdx] = useState(initialIndex)
  const count = images?.length ?? 0

  const prev = useCallback(() => setIdx(i => (i - 1 + count) % count), [count])
  const next = useCallback(() => setIdx(i => (i + 1) % count), [count])

  useEffect(() => {
    const onKey = (e) => {
      if      (e.key === 'Escape')      onClose()
      else if (e.key === 'ArrowLeft')   prev()
      else if (e.key === 'ArrowRight')  next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  if (count === 0) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Header */}
      <div
        onClick={e => e.stopPropagation()}
        className="flex items-center justify-between px-5 sm:px-8 py-4 text-white"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-[var(--green)]/20 border border-[var(--green)]/40
                           flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--green)]" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M8 6 L9.5 4 H14.5 L16 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {title && <h2 className="font-semibold truncate">{title}</h2>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text2)] tabular-nums">
            {idx + 1} / {count}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10
                       flex items-center justify-center text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative flex-1 flex items-center justify-center px-3 sm:px-16 py-2 overflow-hidden"
      >
        <img
          src={images[idx]}
          alt={`Image ${idx + 1} of ${count}`}
          className="max-w-full max-h-full object-contain rounded-md"
        />

        {count > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12
                         rounded-full bg-white/10 hover:bg-white/20 border border-white/10
                         flex items-center justify-center text-white text-2xl"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12
                         rounded-full bg-white/10 hover:bg-white/20 border border-white/10
                         flex items-center justify-center text-white text-2xl"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-2 px-4 py-4 overflow-x-auto"
        >
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Show image ${i + 1}`}
              className={`shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden transition-all
                          ${i === idx
                            ? 'ring-2 ring-[var(--green)] opacity-100'
                            : 'ring-1 ring-white/10 opacity-60 hover:opacity-100'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

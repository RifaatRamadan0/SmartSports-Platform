import { useState } from 'react'

export default function ImageCarousel({ images, heightClass = 'h-72 sm:h-[420px]' }) {
  const [idx, setIdx] = useState(0)
  const count = images.length

  if (count === 0) {
    return (
      <div className={`w-full ${heightClass} bg-[var(--surface)] flex items-center justify-center`}>
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
    <div className={`relative w-full ${heightClass} bg-[var(--surface)] overflow-hidden group`}>
      <img
        src={images[idx]}
        alt={`Pitch image ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {count > 1 && (
        <>
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

          <span className="absolute top-3 right-3 text-[11px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5">
            {idx + 1} / {count}
          </span>
        </>
      )}
    </div>
  )
}

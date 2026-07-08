import { useState } from 'react'

export default function StarRatingInput({ value = 0, onChange, disabled = false }) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !disabled && setHover(i)}
          onMouseLeave={() => setHover(0)}
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i === 1 ? '' : 's'}`}
          className={`text-3xl leading-none transition-transform duration-100
                      ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                      ${i <= active ? 'text-yellow-400' : 'text-[var(--text3)]'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

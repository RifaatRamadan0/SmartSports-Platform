export default function StarRating({ value }) {
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

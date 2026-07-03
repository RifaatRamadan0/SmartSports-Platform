const STATUS_STYLES = {
  confirmed: 'bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]',
  pending:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
  cancelled: 'bg-[var(--red-muted)] border-[var(--red-border)] text-[var(--red)]',
}

const FALLBACK = STATUS_STYLES.pending

export default function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status?.toLowerCase()] ?? FALLBACK

  return (
    <span
      className={`
        px-2.5 py-1 rounded-full border
        text-[10px] font-bold tracking-widest uppercase
        ${styles}
      `}
    >
      {status}
    </span>
  )
}

const STATUS_STYLES = {
  confirmed: 'bg-[#0f1a12] border-[#1f3d26] text-green-400',
  pending:   'bg-[#1a140a] border-[#d97706] text-amber-400',
  cancelled: 'bg-[#1a0f0f] border-[#7f1d1d] text-red-400',
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
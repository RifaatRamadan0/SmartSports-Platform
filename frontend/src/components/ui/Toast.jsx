import { useEffect } from 'react'

export default function Toast({ message, type = 'success', duration = 3500, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = type === 'success' ? 'bg-[var(--bg3)]' : 'bg-[var(--bg3)]'
  const borderColor = type === 'success' ? 'border-[var(--green-border)]' : 'border-[var(--red-border)]'
  const textColor = type === 'success' ? 'text-[var(--green)]' : 'text-[var(--red)]'

  return (
    <div
      className={`
        flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium
        animate-[slideUp_0.3s_ease-out]
        ${bgColor} ${borderColor} ${textColor}
      `}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-[var(--green)]/60 outline-none"
      >
        ×
      </button>
    </div>
  )
}
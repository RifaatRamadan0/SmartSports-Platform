import { useEffect } from 'react'

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3
        px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium
        animate-[slideUp_0.3s_ease-out]
        ${type === 'success'
          ? 'bg-[#0f1a12] border-green-600 text-green-400'
          : 'bg-[#1a0f0f] border-red-600  text-red-400'
        }
      `}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}
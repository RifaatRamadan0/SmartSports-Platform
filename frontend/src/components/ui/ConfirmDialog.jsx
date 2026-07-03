import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  isSubmitting = false,
  children,
}) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)

  const onCancelRef = useRef(onCancel)
  const isSubmittingRef = useRef(isSubmitting)
  useEffect(() => {
    onCancelRef.current = onCancel
    isSubmittingRef.current = isSubmitting
  })

  useEffect(() => {
    if (!isOpen) return

    previouslyFocused.current = document.activeElement
    const node = dialogRef.current
    const getFocusable = () =>
      node
        ? Array.from(
            node.querySelectorAll(
              'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.disabled)
        : []

    // Move focus into the dialog so keyboard/screen-reader users start inside it.
    getFocusable()[0]?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        onCancelRef.current?.()
        return
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable()
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Restore focus to whatever was focused before the dialog opened.
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/70 backdrop-blur-sm"
      onClick={() => !isSubmitting && onCancel?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.07]
                   bg-[var(--surface)] p-6 shadow-2xl"
      >
        <p
          className={`text-[10px] font-bold tracking-widest uppercase ${
            isDanger ? 'text-[var(--red)]' : 'text-[var(--green)]'
          }`}
        >
          {title}
        </p>

        {message && (
          <p className="mt-4 text-sm text-[var(--text2)] leading-relaxed">
            {message}
          </p>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-xs font-semibold border
                       border-white/[0.07] text-[var(--text2)] hover:text-white hover:border-white/30
                       transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--green)]/60 outline-none"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white hover:opacity-90 active:scale-95
                       transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--green)]/60 outline-none ${
              isDanger ? 'bg-[var(--red)]' : 'bg-[var(--green)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

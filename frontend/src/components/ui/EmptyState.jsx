// Shared empty / zero-result state: a bordered surface panel with an optional
// icon, a title, a supporting message, and an optional action (e.g. a button).
export default function EmptyState({ icon, title, message, action, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-[var(--surface)] px-6 py-12 text-center ${className}`}
    >
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <p className="text-base font-semibold text-white">{title}</p>
      {message && (
        <p className="mt-1.5 text-sm text-[var(--text3)] max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

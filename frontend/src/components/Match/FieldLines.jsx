export default function FieldLines() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.08 }}
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="398" height="158" rx="3" stroke="white" strokeWidth="2" />
      <line x1="200" y1="1" x2="200" y2="159" stroke="white" strokeWidth="1.5" />
      <circle cx="200" cy="80" r="36" stroke="white" strokeWidth="1.5" />
      <rect x="1" y="48" width="46" height="64" stroke="white" strokeWidth="1.5" />
      <rect x="353" y="48" width="46" height="64" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

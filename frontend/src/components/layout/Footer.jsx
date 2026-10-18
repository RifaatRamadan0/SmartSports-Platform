export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[var(--bg)]">
      <div className="mx-auto max-w-[1280px] px-6 py-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
            <span className="text-sm font-bold tracking-tight text-white">SmartSports</span>
          </div>
          <p className="text-xs text-[var(--text2)] mt-2 max-w-[220px] leading-relaxed">
            The easiest way to book sports facilities in your city.
          </p>
        </div>
        <p className="text-[12px] text-[var(--text3)]">
          © {new Date().getFullYear()} SmartSports Ltd. · Built for the city.
        </p>
      </div>
    </footer>
  )
}

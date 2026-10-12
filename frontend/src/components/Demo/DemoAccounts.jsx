import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Loader2 } from 'lucide-react'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_LIMIT_NOTE } from '@/constants/demo'

// Register page: explains why the SMS step may fail on the live demo.
export function DemoNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-[0.625rem] border border-sky-500/30 bg-sky-500/10 px-3.5 py-3 text-xs leading-relaxed text-sky-300">
      <Info size={15} className="mt-px shrink-0" />
      <span>
        {DEMO_LIMIT_NOTE}{' '}
        <Link to="/login" className="font-semibold underline hover:text-sky-200">
          Go to sign in
        </Link>
      </span>
    </div>
  )
}

// Clicking an account logs in straight away.
export function DemoAccounts({ onSelect, disabled }) {
  const [pending, setPending] = useState(null)

  async function handleClick(username) {
    setPending(username)
    try {
      await onSelect(username, DEMO_PASSWORD)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[0.75rem] border border-primary/25 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-semibold text-foreground">Demo accounts</span>
        <span className="text-xs text-muted-foreground">One click to sign in</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map(({ label, username, icon: Icon }) => (
          <button
            key={username}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(username)}
            title={`Sign in as ${username}`}
            className="flex flex-col items-center gap-1 rounded-[0.625rem] border border-border bg-input px-2 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {pending === username
                ? <Loader2 size={16} className="animate-spin" />
                : <Icon size={16} />}
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="max-w-full truncate text-[0.6875rem] text-muted-foreground">{username}</span>
          </button>
        ))}
      </div>

      <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        {DEMO_LIMIT_NOTE}
      </p>
    </div>
  )
}

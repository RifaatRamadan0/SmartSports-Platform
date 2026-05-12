import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import api from '@/services/api'

const Logo = () => (
  <div className="mb-8 flex flex-col items-center text-center">
    <div className="mb-4 flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
      <svg
        width="26" height="26" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="text-primary"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    </div>
    <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground">SmartSports</h1>
    <p className="mt-1 text-sm text-muted-foreground">Book your perfect pitch</p>
  </div>
)

// Three possible states: verifying | success | error
function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token          = searchParams.get('token')

  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token found in the link.')
      return
    }

    const controller = new AbortController()

    api.get('/api/auth/verify-email', { params: { token }, signal: controller.signal })
      .then(() => setStatus('success'))
      .catch(err => {
        if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return
        const msg = err.response?.data?.message
        setErrorMsg(msg ?? 'This link has expired or already been used.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [token])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <Logo />

        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardContent className="pb-8 pt-8">

            {status === 'verifying' && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
                  <Loader2 size={26} className="animate-spin text-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-bold text-foreground">Verifying your email…</h2>
                  <p className="text-sm text-muted-foreground">This will only take a moment.</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
                  <CheckCircle2 size={26} className="text-green-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-bold text-foreground">Email verified!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your account is now active. You can sign in to SmartSports.
                  </p>
                </div>
                <div className="w-full border-t border-border pt-5">
                  <Link
                    to="/login"
                    className="block w-full rounded-[0.625rem] bg-primary py-2.5 text-center text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10">
                  <AlertCircle size={26} className="text-destructive" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-bold text-foreground">Verification failed</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
                </div>
                <div className="w-full border-t border-border pt-5">
                  <Link
                    to="/verify-email"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Request a new verification link
                  </Link>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConfirmEmailPage

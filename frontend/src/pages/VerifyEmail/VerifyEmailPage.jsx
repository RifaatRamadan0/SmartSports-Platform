import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailCheck, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

function VerifyEmailPage() {
  const location = useLocation()

  const fromRegistration = Boolean(location.state?.email)

  const [email, setEmail]           = useState(location.state?.email ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resent, setResent]         = useState(false)
  const [error, setError]           = useState('')

  async function handleResend(e) {
    e.preventDefault()
    setError('')
    setResent(false)
    setIsSubmitting(true)
    try {
      await api.post('/api/auth/resend-verification', { email })
      setResent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <Logo />

        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardHeader className="pb-0">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
              <MailCheck size={22} className="text-primary" />
            </div>
            {fromRegistration ? (
              <>
                <CardTitle className="text-lg font-bold text-foreground">
                  Check your inbox
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  We sent a verification link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                  . Click it to activate your account.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-lg font-bold text-foreground">
                  Verify your email
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your email address below and we'll send you a new verification link.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleResend} className="flex flex-col gap-3">
              {fromRegistration && (
                <p className="text-[0.8125rem] text-muted-foreground">
                  Didn't receive it? Enter your email and we'll send a new link.
                </p>
              )}

              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 text-[0.9375rem] text-foreground"
              />

              {error && (
                <div className="flex items-center gap-2.5 rounded-[0.625rem] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {resent && (
                <div className="rounded-[0.625rem] border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-sm text-green-400">
                  A new verification link has been sent if that email is registered.
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                {isSubmitting
                  ? <><RefreshCw size={14} className="animate-spin" /> Sending…</>
                  : 'Send verification email'
                }
              </Button>
            </form>

            <div className="mt-6 border-t border-border pt-6 text-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VerifyEmailPage

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import PageWrapper from '@/components/routing/PageWrapper'
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

function ForgotPasswordPage() {
  const [email, setEmail]           = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [sent, setSent]             = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <Logo />

        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          {sent ? (
            <CardContent className="pb-8 pt-8">
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
                  <CheckCircle2 size={26} className="text-green-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-bold text-foreground">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If{' '}
                    <span className="font-medium text-foreground">{email}</span>{' '}
                    is registered, a reset link has been sent.
                    <br />
                    <span className="text-[0.8125rem]">The link expires in 15 minutes.</span>
                  </p>
                </div>
                <div className="w-full border-t border-border pt-5">
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </Link>
                </div>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-bold text-foreground">
                  Forgot password?
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your email and we'll send you a reset link.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="email"
                      className="text-[0.8125rem] font-medium text-muted-foreground"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="h-10 rounded-[0.625rem] border-border bg-input pl-9 pr-3.5 text-[0.9375rem] text-foreground"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2.5 rounded-[0.625rem] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                      <AlertCircle size={15} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
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
            </>
          )}
        </Card>
      </div>
    </PageWrapper>
  )
}

export default ForgotPasswordPage

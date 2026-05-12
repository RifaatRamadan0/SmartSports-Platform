import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
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

const PageShell = ({ children }) => (
  <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
    />
    <div className="relative z-10 w-full max-w-sm">
      <Logo />
      {children}
    </div>
  </div>
)

function InvalidToken() {
  return (
    <PageShell>
      <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
        <CardContent className="pb-8 pt-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10">
              <AlertCircle size={26} className="text-destructive" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-foreground">Invalid reset link</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This link is missing or malformed. Please request a new one.
              </p>
            </div>
            <div className="w-full border-t border-border pt-5">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Request a new link
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token')

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)

  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(id)
  }, [success, navigate])

  if (!token) return <InvalidToken />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/api/auth/reset-password', { token, newPassword })
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg ?? 'This link has expired or already been used. Please request a new one.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <PageShell>
        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardContent className="pb-8 pt-8">
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
                <CheckCircle2 size={26} className="text-green-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-bold text-foreground">Password reset!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your password has been updated. Redirecting you to sign in…
                </p>
              </div>
              <div className="w-full border-t border-border pt-5">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <ArrowLeft size={14} />
                  Go to sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Set new password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose a strong password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="newPassword"
                className="text-[0.8125rem] font-medium text-muted-foreground"
              >
                New password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[0.75rem] text-muted-foreground">Minimum 8 characters.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-[0.8125rem] font-medium text-muted-foreground"
              >
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-[0.625rem] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                <AlertCircle size={15} className="mt-px shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
            >
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </Button>

          </form>

          <div className="mt-6 border-t border-border pt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Request a different link
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default ResetPasswordPage

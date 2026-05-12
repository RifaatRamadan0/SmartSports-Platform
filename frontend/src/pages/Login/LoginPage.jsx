import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLoginForm } from '@/hooks/useLoginForm'

function LoginPage() {
  const { form, error, unverified, isSubmitting, handleChange, handleSubmit } = useLoginForm()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      {/* subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
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
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground">
            SmartSports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Book your perfect pitch
          </p>
        </div>

        {/* Card */}
        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold text-foreground">
              Welcome back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="emailOrUsername"
                  className="text-[0.8125rem] font-medium text-muted-foreground"
                >
                  Email or Username
                </label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  name="emailOrUsername"
                  value={form.emailOrUsername}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 text-[0.9375rem] text-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-[0.8125rem] font-medium text-muted-foreground"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[0.8125rem] font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center bg-transparent p-0 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {unverified && (
                <div className="rounded-[0.625rem] border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-400">
                  <div className="flex items-start gap-2.5">
                    <MailWarning size={15} className="mt-px shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">Email not verified</span>
                      <span className="text-amber-400/80">
                        Please check your inbox and click the verification link.{' '}
                        <Link to="/verify-email" className="font-semibold underline hover:text-amber-300">
                          Resend link
                        </Link>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 rounded-[0.625rem] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </Button>

            </form>

            <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage

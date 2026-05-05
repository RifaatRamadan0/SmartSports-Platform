import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLoginForm } from './useLoginForm'

function LoginPage() {
  const { form, error, isSubmitting, handleChange, handleSubmit } = useLoginForm()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(160deg, #0f1a12 0%, var(--bg) 60%)' }}
    >
      {/* subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-14 items-center justify-center rounded-full"
            style={{
              border: '2px solid var(--green-border)',
              background: 'var(--green-muted)',
            }}
          >
            <svg
              width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <h1
            className="text-[1.75rem] font-extrabold tracking-tight"
            style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}
          >
            SmartSports
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text3)' }}>
            Book your perfect pitch
          </p>
        </div>

        {/* Card */}
        <Card
          className="border-0 shadow-none"
          style={{
            background: 'var(--surface)',
            boxShadow: '0 0 0 1px var(--border), 0 24px 48px rgba(0,0,0,0.4)',
            borderRadius: '1.25rem',
          }}
        >
          <CardHeader className="pb-0">
            <CardTitle
              className="text-lg font-bold"
              style={{ color: 'var(--text)' }}
            >
              Welcome back
            </CardTitle>
            <CardDescription style={{ color: 'var(--text2)' }}>
              Sign in to your account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="emailOrUsername"
                  className="text-[0.8125rem] font-medium"
                  style={{ color: 'var(--text2)' }}
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
                  className="h-10 rounded-[0.625rem] px-3.5 text-[0.9375rem]"
                  style={{
                    background: 'var(--bg3)',
                    color: 'var(--text)',
                    borderColor: 'var(--border)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-[0.8125rem] font-medium"
                  style={{ color: 'var(--text2)' }}
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="h-10 rounded-[0.625rem] pr-10 px-3.5 text-[0.9375rem]"
                    style={{
                      background: 'var(--bg3)',
                      color: 'var(--text)',
                      borderColor: 'var(--border)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-[0.625rem] px-3.5 py-2.5 text-sm"
                  style={{
                    background: 'var(--red-muted)',
                    border: '1px solid var(--red-border)',
                    color: 'var(--red)',
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-10 w-full rounded-[0.625rem] text-[0.9375rem] font-bold tracking-tight"
                style={{
                  background: isSubmitting ? 'var(--green-dim)' : 'var(--green)',
                  color: '#061008',
                }}
              >
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </Button>

            </form>

            <div
              className="mt-6 border-t pt-6 text-center text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold hover:underline"
                style={{ color: 'var(--green)' }}
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

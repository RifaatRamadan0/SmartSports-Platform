import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ChevronRight, AlertCircle, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useRegisterForm } from '@/hooks/useRegisterForm'

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro']
const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any']
const PW_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const PW_BAR_COLORS = ['', 'bg-destructive', 'bg-amber-500', 'bg-lime-500', 'bg-primary']

function pwStrength(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

function AvailabilityIcon({ status }) {
  if (status === 'checking') return <Loader2 size={16} className="animate-spin text-muted-foreground" />
  if (status === 'available') return <Check size={16} className="text-primary" />
  if (status === 'taken') return <X size={16} className="text-destructive" />
  return null
}

const ROLE_OPTIONS = [
  { value: 'Player', icon: '⚽', title: 'Player', desc: 'Find pitches, join matches, book slots' },
  { value: 'PitchOwner', icon: '🏟', title: 'Pitch Owner', desc: 'List your facilities and manage bookings' },
]

function OtpBoxes({ onComplete, disabled, shake }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef([])

  useEffect(() => {
    if (!disabled) refs.current[0]?.focus()
  }, [disabled])

  function handleKey(e, idx) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (digits[idx]) {
        next[idx] = ''
        setDigits(next)
      } else if (idx > 0) {
        next[idx - 1] = ''
        setDigits(next)
        refs.current[idx - 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleInput(e, idx) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return

    if (raw.length > 1) {
      const chars = raw.slice(0, 6).split('')
      const next = [...digits]
      chars.forEach((c, i) => { if (i < 6) next[i] = c })
      setDigits(next)
      const lastFilled = Math.min(chars.length - 1, 5)
      refs.current[lastFilled]?.focus()
      if (chars.length === 6) onComplete(chars.join(''))
      return
    }

    const next = [...digits]
    next[idx] = raw[0]
    setDigits(next)
    if (idx < 5) refs.current[idx + 1]?.focus()
    if (idx === 5 && next.every(d => d)) onComplete(next.join(''))
  }

  return (
    <div className={`flex gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d}
          disabled={disabled}
          onKeyDown={e => handleKey(e, i)}
          onChange={e => handleInput(e, i)}
          className={`h-11 w-full rounded-[0.625rem] border bg-input text-center text-lg font-bold text-foreground caret-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-colors ${
            d ? 'border-primary/40' : 'border-border'
          }`}
        />
      ))}
    </div>
  )
}

function RegisterPage() {
  const {
    form, step, error, fieldErrors, availability, isSubmitting,
    otpState, otpError, countdown, phoneIsValidAndAvailable,
    handleChange, setField, sendCode, resendCode, submitOtp,
    handleStep1, handleSubmit, back,
  } = useRegisterForm()
  const [showPw, setShowPw] = useState(false)

  const strength = pwStrength(form.password)
  const otpVisible = otpState === 'sent' || otpState === 'verifying' || otpState === 'error'
  const shake = otpState === 'error'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f1a12] to-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[60px_60px]"
      />

      <div className="relative z-10 w-full max-w-md">
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

        <Card className="rounded-[1.25rem] border-0 bg-card shadow-[0_0_0_1px_var(--border),0_24px_48px_rgba(0,0,0,0.4)] ring-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold text-foreground">
              {step === 1 ? 'Create your account' : 'Complete your profile'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1
                ? 'Join SmartSports to find and book pitches'
                : 'Help us personalise your experience'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-5 flex items-center gap-2">
              <div className={`size-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
              <div className="h-px flex-1 bg-border" />
              <div className={`size-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-[0.625rem] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1} noValidate className="flex flex-col gap-4">

                {/* Role selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.8125rem] font-medium text-muted-foreground">
                    I am a…
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(r => {
                      const selected = form.role === r.value
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setField('role', r.value)}
                          className={`flex flex-col items-start gap-1 rounded-[0.75rem] border p-3 text-left transition-colors ${
                            selected
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border bg-input hover:border-border/80'
                          }`}
                        >
                          <span className="text-xl leading-none">{r.icon}</span>
                          <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
                            {r.title}
                          </span>
                          <span className="text-xs leading-snug text-muted-foreground">
                            {r.desc}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="username" className="text-[0.8125rem] font-medium text-muted-foreground">
                    Username
                  </label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      minLength={3}
                      maxLength={50}
                      placeholder="Choose a username"
                      autoComplete="username"
                      aria-invalid={!!fieldErrors.username || availability.username === 'taken'}
                      className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <AvailabilityIcon status={availability.username} />
                    </span>
                  </div>
                  {fieldErrors.username ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}{fieldErrors.username}</p>
                  ) : availability.username === 'taken' ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}Username is already taken</p>
                  ) : availability.username === 'available' ? (
                    <p className="text-xs text-primary">Username is available</p>
                  ) : null}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[0.8125rem] font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                      aria-invalid={!!fieldErrors.email || availability.email === 'taken'}
                      className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <AvailabilityIcon status={availability.email} />
                    </span>
                  </div>
                  {fieldErrors.email ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}{fieldErrors.email}</p>
                  ) : availability.email === 'taken' ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}Email is already in use</p>
                  ) : availability.email === 'available' ? (
                    <p className="text-xs text-primary">Email is available</p>
                  ) : null}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-[0.8125rem] font-medium text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      aria-invalid={!!fieldErrors.password}
                      className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center bg-transparent p-0 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}{fieldErrors.password}</p>
                  )}
                  {form.password && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i <= strength ? PW_BAR_COLORS[strength] : 'bg-border'}`}
                          />
                        ))}
                      </div>
                      <span className="w-12 text-right text-[0.6875rem] font-medium text-muted-foreground">
                        {PW_LABELS[strength]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Phone Number + OTP */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phoneNumber" className="text-[0.8125rem] font-medium text-muted-foreground">
                    Phone Number
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        placeholder="+961 3 123 456"
                        autoComplete="tel"
                        disabled={otpState === 'verified'}
                        aria-invalid={!!fieldErrors.phoneNumber || availability.phoneNumber === 'taken'}
                        className="h-10 rounded-[0.625rem] border-border bg-input px-3.5 pr-10 text-[0.9375rem] text-foreground disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        {otpState === 'verified'
                          ? <Check size={16} className="text-primary" />
                          : <AvailabilityIcon status={availability.phoneNumber} />
                        }
                      </span>
                    </div>

                    {otpState !== 'verified' && (
                      <button
                        type="button"
                        disabled={!phoneIsValidAndAvailable || otpState !== 'idle'}
                        onClick={sendCode}
                        className="h-10 shrink-0 rounded-[0.625rem] border border-primary/40 bg-primary/10 px-3 text-[0.8125rem] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {otpState === 'sending'
                          ? <Loader2 size={14} className="animate-spin" />
                          : 'Send Code'
                        }
                      </button>
                    )}
                  </div>

                  {fieldErrors.phoneNumber ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}{fieldErrors.phoneNumber}</p>
                  ) : availability.phoneNumber === 'taken' ? (
                    <p className="text-xs text-destructive"><span aria-hidden="true">⚠</span>{' '}Phone number is already registered</p>
                  ) : availability.phoneNumber === 'available' && otpState === 'idle' ? (
                    <p className="text-xs text-primary">Phone number is available — tap Send Code to verify</p>
                  ) : null}

                  {/* OTP boxes slide in */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      otpVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="flex flex-col gap-2 pt-1">
                      <OtpBoxes
                        onComplete={submitOtp}
                        disabled={otpState === 'verifying'}
                        shake={shake}
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          {otpError && (
                            <p className="text-xs text-destructive">{otpError}</p>
                          )}
                        </div>
                        <div>
                          {countdown > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Resend in {countdown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={resendCode}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Resend code
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verified banner */}
                  {otpState === 'verified' && (
                    <div className="flex items-center gap-1.5 rounded-[0.625rem] border border-primary/20 bg-primary/5 px-3 py-2">
                      <Check size={14} className="text-primary" />
                      <span className="text-xs font-medium text-primary">Phone verified</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    availability.username    === 'checking' ||
                    availability.email       === 'checking' ||
                    availability.phoneNumber === 'checking' ||
                    availability.username    === 'taken'    ||
                    availability.email       === 'taken'    ||
                    availability.phoneNumber === 'taken'    ||
                    otpState !== 'verified'
                  }
                  className="mt-1 h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                >
                  Continue <ChevronRight size={14} />
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

                {form.role === 'Player' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.8125rem] font-medium text-muted-foreground">
                      Skill Level <span className="text-muted-foreground/70">(optional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILL_LEVELS.map((lbl, i) => {
                        const lvl = i + 1
                        const selected = form.skillLevel === lvl
                        return (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setField('skillLevel', selected ? null : lvl)}
                            className={`flex items-center gap-2 rounded-[0.625rem] border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                              selected
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-input text-foreground hover:border-border/80'
                            }`}
                          >
                            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold ${
                              selected ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
                            }`}>
                              {lvl}
                            </span>
                            {lbl}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {form.role === 'Player' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.8125rem] font-medium text-muted-foreground">
                      Preferred Position <span className="text-muted-foreground/70">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {POSITIONS.map(p => {
                        const selected = form.preferredPosition === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setField('preferredPosition', selected ? '' : p)}
                            className={`rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                              selected
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-input text-muted-foreground hover:border-border/80'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 h-10 w-full rounded-[0.625rem] bg-primary text-[0.9375rem] font-bold tracking-tight text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                  ) : (
                    <>Create Account <ChevronRight size={14} /></>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={back}
                  className="h-9 w-full rounded-[0.625rem] bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  By creating an account you agree to our{' '}
                  <Link className="text-primary hover:underline" to="/terms">Terms of Service</Link> and{' '}
                  <Link className="text-primary hover:underline" to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            )}

            <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RegisterPage

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Shield, ChevronLeft, Camera, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getRoleHomePath } from '../../utils/roleUtils'
import { requestPitchOwnerRole, addPlayerRoleInstantly, getMyRoleRequests } from '../../services/Settings/settingsService'
import { getMyProfile, updateMyProfile, changeMyPassword, sendPhoneVerification, verifyPhone } from '../../services/User/userService'
import { parseApiError } from '../../utils/errorUtils'
import { refreshSession } from '../../services/authInterceptor'
import { tweenTransition } from '../../lib/motion'
import { cn } from '../../lib/utils'
import { uploadToImageKit, isImageKitConfigured } from '../../services/imagekit'

// ── Constants ─────────────────────────────────────────────────────────────────

const SKILL_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Professional' }

const NAV_ITEMS = [
  { id: 'profile',  label: 'Profile',  icon: User   },
  { id: 'security', label: 'Security', icon: Lock   },
  { id: 'account',  label: 'Account',  icon: Shield },
]

// ── Shared animation wrapper ──────────────────────────────────────────────────

function SectionPane({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={tweenTransition}
    >
      {children}
    </motion.div>
  )
}

// ── Reusable form primitives ──────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <span className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider">
      {children}
    </span>
  )
}

function TextInput({ className, ...props }) {
  return (
    <input
      className={cn(
        'rounded-xl bg-[var(--bg)] border border-white/[0.08] px-3 py-2.5',
        'text-[13px] text-white placeholder-[var(--text3)]',
        'focus:outline-none focus:border-[var(--green)]/60 transition-colors',
        className
      )}
      {...props}
    />
  )
}

function SaveButton({ loading, label = 'Save changes' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                 text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}

// ── Small badges ──────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const map = {
    Player:     'bg-blue-500/10 border-blue-500/30 text-blue-400',
    PitchOwner: 'bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]',
    Admin:      'bg-purple-500/10 border-purple-500/30 text-purple-400',
  }
  return (
    <span className={cn('px-3 py-1.5 rounded-full border text-[12px] font-bold', map[role] ?? '')}>
      {role === 'PitchOwner' ? 'Pitch Owner' : role}
    </span>
  )
}

function RequestStatusBadge({ status }) {
  const map = {
    0: { label: 'Pending',  cls: 'bg-[#1a140a] border-amber-600/50 text-amber-400' },
    1: { label: 'Approved', cls: 'bg-[#0f1a12] border-green-600/50 text-green-400' },
    2: { label: 'Rejected', cls: 'bg-[#1a0f0f] border-red-600/50 text-red-400'    },
  }
  const { label, cls } = map[status] ?? map[0]
  return (
    <span className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase', cls)}>
      {label}
    </span>
  )
}

// ── Avatar upload widget ──────────────────────────────────────────────────────

function AvatarUpload({ src, username, onUploaded, onError }) {
  const inputRef  = useRef(null)
  const [busy, setBusy] = useState(false)
  const initials  = username ? username.slice(0, 2).toUpperCase() : '??'
  const canUpload = isImageKitConfigured()

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onError('Please pick an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      onError('Image must be under 5 MB.')
      return
    }

    setBusy(true)
    try {
      const { url } = await uploadToImageKit(file, '/smartsports/profiles')
      onUploaded(url)
    } catch (err) {
      onError(err.message ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative w-16 h-16 group">
      {/* Avatar display */}
      {src ? (
        <img src={src} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-white/10" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/20 border border-[var(--green)]/30
                        flex items-center justify-center text-[var(--green)] text-lg font-bold">
          {initials}
        </div>
      )}

      {/* Upload overlay — only shown when ImageKit is configured */}
      {canUpload && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Change profile picture"
            className="absolute inset-0 rounded-full flex items-center justify-center
                       bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                       disabled:cursor-wait"
          >
            {busy
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Camera  size={18} className="text-white" />
            }
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}

// ── Section: Profile ──────────────────────────────────────────────────────────

function ProfileSection({ profile, profileLoading, showToast }) {
  const [form,   setForm]   = useState({
    username: '', phoneNumber: '', profilePicture: '', skillLevel: '', preferredPosition: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      username:          profile.username          ?? '',
      phoneNumber:       profile.phoneNumber        ?? '',
      profilePicture:    profile.profilePicture     ?? '',
      skillLevel:        profile.skillLevel != null ? String(profile.skillLevel) : '',
      preferredPosition: profile.preferredPosition  ?? '',
    })
  }, [profile])

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMyProfile({
        username:          form.username,
        phoneNumber:       form.phoneNumber,
        profilePicture:    form.profilePicture   || null,
        skillLevel:        form.skillLevel ? Number(form.skillLevel) : null,
        preferredPosition: form.preferredPosition || null,
      })
      showToast('Profile updated.')
    } catch (err) {
      showToast(parseApiError(err, 'Could not update profile.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar + name header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/[0.06]">
        <AvatarUpload
          src={form.profilePicture}
          username={form.username}
          onUploaded={url => setForm(f => ({ ...f, profilePicture: url }))}
          onError={msg => showToast(msg, 'error')}
        />
        <div>
          <p className="text-[15px] font-semibold text-white">{profile?.username}</p>
          <p className="text-[12px] text-[var(--text3)]">{profile?.email}</p>
          <p className="text-[11px] text-[var(--text3)] mt-0.5">Click the avatar to change your photo</p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Username</FieldLabel>
          <TextInput
            type="text"
            value={form.username}
            onChange={set('username')}
            required minLength={3} maxLength={50}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Phone Number</FieldLabel>
          <TextInput
            type="tel"
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Skill Level</FieldLabel>
          <select
            value={form.skillLevel}
            onChange={set('skillLevel')}
            className="rounded-xl bg-[var(--bg)] border border-white/[0.08] px-3 py-2.5
                       text-[13px] text-white focus:outline-none focus:border-[var(--green)]/60 transition-colors"
          >
            <option value="">— Not set —</option>
            {Object.entries(SKILL_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Preferred Position</FieldLabel>
          <TextInput
            type="text"
            value={form.preferredPosition}
            onChange={set('preferredPosition')}
            placeholder="e.g. Goalkeeper, Striker"
          />
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} />
      </div>
    </form>
  )
}

// ── Section: Security ─────────────────────────────────────────────────────────

function SecuritySection({ profile, showToast, onPhoneVerified }) {
  const [form,        setForm]        = useState({ currentPassword: '', newPassword: '' })
  const [saving,      setSaving]      = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)

  // Phone re-verification flow
  const [otpSent,     setOtpSent]     = useState(false)
  const [otpCode,     setOtpCode]     = useState('')
  const [otpSending,  setOtpSending]  = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await changeMyPassword(form)
      setForm({ currentPassword: '', newPassword: '' })
      setShowCurrent(false)
      setShowNew(false)
      showToast('Password changed.')
    } catch (err) {
      showToast(parseApiError(err, 'Could not change password.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSendOtp = async () => {
    setOtpSending(true)
    try {
      await sendPhoneVerification()
      setOtpSent(true)
      setOtpCode('')
      showToast('Verification code sent to your phone.')
    } catch (err) {
      showToast(parseApiError(err, 'Could not send verification code.'), 'error')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async e => {
    e.preventDefault()
    setOtpVerifying(true)
    try {
      await verifyPhone(otpCode)
      onPhoneVerified()
      setOtpSent(false)
      setOtpCode('')
      showToast('Phone number verified.')
    } catch (err) {
      showToast(parseApiError(err, 'Verification failed.'), 'error')
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Verification status */}
      {profile && (
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5">
          <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-3">
            Verification Status
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text2)]">Email</span>
              <span className={cn(
                'text-[11px] font-bold px-2.5 py-1 rounded-full border',
                profile.isEmailVerified
                  ? 'bg-[#0f1a12] border-green-600/50 text-green-400'
                  : 'bg-[#1a0f0f] border-red-600/50 text-red-400'
              )}>
                {profile.isEmailVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text2)]">Phone</span>
              <span className={cn(
                'text-[11px] font-bold px-2.5 py-1 rounded-full border',
                profile.isPhoneVerified
                  ? 'bg-[#0f1a12] border-green-600/50 text-green-400'
                  : 'bg-[#1a0f0f] border-red-600/50 text-red-400'
              )}>
                {profile.isPhoneVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Phone re-verification — only shown when phone is unverified */}
      {profile && !profile.isPhoneVerified && (
        <div className="rounded-2xl border border-amber-600/30 bg-[#1a140a] p-5">
          <p className="text-[11px] font-bold tracking-widest uppercase text-amber-500 mb-1">
            Phone Verification Required
          </p>
          <p className="text-[12px] text-[var(--text2)] mb-4">
            Your phone number <span className="text-white font-medium">{profile.phoneNumber}</span> is
            not verified. Verify it to keep your account secure.
          </p>

          {!otpSent ? (
            <button
              onClick={handleSendOtp}
              disabled={otpSending}
              className="px-4 py-2 rounded-full bg-amber-500 text-black text-[12px] font-bold
                         hover:brightness-110 transition-all disabled:opacity-50"
            >
              {otpSending ? 'Sending…' : 'Send Verification Code'}
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <TextInput
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-44"
                  required
                />
                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length < 4}
                  className="px-4 py-2 rounded-full bg-amber-500 text-black text-[12px] font-bold
                             hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {otpVerifying ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending}
                className="text-[11px] text-[var(--text3)] hover:text-white transition-colors text-left disabled:opacity-50"
              >
                {otpSending ? 'Sending…' : 'Resend code'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Change password */}
      <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5">
        <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-4">
          Change Password
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Current Password</FieldLabel>
            <div className="relative">
              <TextInput
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={set('currentPassword')}
                className="w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-white transition-colors"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>New Password</FieldLabel>
            <div className="relative">
              <TextInput
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={set('newPassword')}
                className="w-full pr-10"
                required minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-white transition-colors"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text3)]">Minimum 8 characters.</p>
          </label>
          <div className="flex justify-end">
            <SaveButton loading={saving} label="Change Password" />
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Section: Account ──────────────────────────────────────────────────────────

function AccountSection({ roles, showToast }) {
  const navigate = useNavigate()
  const { login } = useAuth()

  const isPlayer = roles.includes(ROLES.PLAYER)
  const isOwner  = roles.includes(ROLES.PITCH_OWNER)
  const isAdmin  = roles.includes(ROLES.ADMIN)

  const [requests,      setRequests]      = useState([])
  const [isLoadingReqs, setIsLoadingReqs] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = useCallback(async () => {
    setIsLoadingReqs(true)
    try {
      const data = await getMyRoleRequests()
      setRequests(data ?? [])
    } catch {
      showToast('Could not load role requests.', 'error')
    } finally {
      setIsLoadingReqs(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchRequests()
    const hasPending = () => requests.some(r => r.status === 0)
    const interval = setInterval(() => { if (hasPending()) fetchRequests() }, 30_000)
    return () => clearInterval(interval)
  }, [fetchRequests]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPendingOwnerRequest = requests.some(
    r => r.requestedRole === 'PitchOwner' && r.status === 0
  )

  const handleRequestOwner = async () => {
    setActionLoading(true)
    try {
      await requestPitchOwnerRole()
      showToast('Request submitted. An admin will review it shortly.')
      await fetchRequests()
    } catch (err) {
      showToast(parseApiError(err, 'Could not submit request.'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddPlayer = async () => {
    setActionLoading(true)
    try {
      await addPlayerRoleInstantly()
      const { data } = await refreshSession()
      login(data)
      navigate('/dashboard')
    } catch (err) {
      showToast(parseApiError(err, 'Could not add Player role.'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Active roles */}
      <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5">
        <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-3">
          Your Roles
        </p>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => <RoleBadge key={r} role={r} />)}
        </div>
        <p className="text-[11px] text-[var(--text3)] mt-3">
          Each role unlocks a different part of the platform.
        </p>
      </div>

      {/* Expand access */}
      {!isAdmin && (
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] p-5">
          <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)] mb-4">
            Expand Access
          </p>

          {isPlayer && !isOwner && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-white">Apply to become a Pitch Owner</p>
                <p className="text-[12px] text-[var(--text2)] mt-1">
                  List your facilities and manage bookings. Requires admin approval.
                </p>
              </div>
              {hasPendingOwnerRequest ? (
                <span className="shrink-0 px-4 py-2 rounded-full text-[12px] font-bold
                                 bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  Pending review
                </span>
              ) : (
                <button
                  onClick={handleRequestOwner}
                  disabled={actionLoading}
                  className="shrink-0 px-4 py-2 rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                             text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting…' : 'Apply Now'}
                </button>
              )}
            </div>
          )}

          {isOwner && !isPlayer && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-white">Add Player access</p>
                <p className="text-[12px] text-[var(--text2)] mt-1">
                  Browse and book pitches as a player. Instant, no approval needed.
                </p>
              </div>
              <button
                onClick={handleAddPlayer}
                disabled={actionLoading}
                className="shrink-0 px-4 py-2 rounded-full bg-[var(--green)] text-[var(--primary-foreground)]
                           text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Adding…' : 'Add Player Role'}
              </button>
            </div>
          )}

          {isPlayer && isOwner && (
            <p className="text-[13px] text-[var(--text2)]">
              You have full access — both Player and Pitch Owner roles are active.
            </p>
          )}
        </div>
      )}

      {/* Request history */}
      {!isAdmin && (
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--text3)]">
              Request History
            </p>
          </div>
          {isLoadingReqs ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[var(--bg)] animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--text2)]">No role requests yet.</p>
          ) : (
            <ul>
              {requests.map((r, i) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex items-center justify-between px-5 py-4 gap-4',
                    i < requests.length - 1 && 'border-b border-white/[0.04]'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">
                      {r.requestedRole === 'PitchOwner' ? 'Pitch Owner' : r.requestedRole} role request
                    </p>
                    <p className="text-[11px] text-[var(--text3)] mt-0.5">{fmtDate(r.createdAt)}</p>
                    {r.status === 2 && r.rejectionReason && (
                      <p className="text-[11px] text-red-400 mt-1">Reason: {r.rejectionReason}</p>
                    )}
                  </div>
                  <RequestStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const navigate = useNavigate()
  const { roles, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg)]/80 border-b border-white/[0.06]">
      <nav className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate(getRoleHomePath(roles))}
          className="flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green-glow)]" />
          <span className="text-[15px] font-bold tracking-tight">SmartSports</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(getRoleHomePath(roles))}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text2)] hover:text-white px-3 py-2 transition-colors"
          >
            <ChevronLeft size={14} />
            Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="text-[12px] font-semibold text-[var(--text2)] hover:text-red-400 px-3 py-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { roles } = useAuth()

  const [activeSection, setActiveSection] = useState('profile')
  const [profile,       setProfile]       = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => showToast('Could not load your profile.', 'error'))
      .finally(() => setProfileLoading(false))
  }, [showToast])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={tweenTransition}
            className={cn(
              'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4',
              'rounded-xl shadow-2xl border text-sm font-medium',
              toast.type === 'success'
                ? 'bg-[#0f1a12] border-green-600 text-green-400'
                : 'bg-[#1a0f0f] border-red-600 text-red-400'
            )}
          >
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} aria-label="Close" className="ml-2 opacity-50 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--green)] mb-1">Account</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden md:flex flex-col gap-0.5 w-48 shrink-0 pt-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                  'transition-all text-left w-full',
                  activeSection === id
                    ? 'bg-[var(--surface)] text-white border-l-2 border-[var(--green)] pl-[10px]'
                    : 'text-[var(--text2)] hover:text-white hover:bg-[var(--surface)]/60'
                )}
              >
                <Icon size={15} className={activeSection === id ? 'text-[var(--green)]' : ''} />
                {label}
              </button>
            ))}
          </aside>

          {/* ── Tab bar (mobile) ── */}
          <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold',
                  'whitespace-nowrap transition-all shrink-0',
                  activeSection === id
                    ? 'bg-[var(--green)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--surface)] text-[var(--text2)] hover:text-white'
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Content panel ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeSection === 'profile' && (
                <SectionPane key="profile">
                  <ProfileSection
                    profile={profile}
                    profileLoading={profileLoading}
                    showToast={showToast}
                  />
                </SectionPane>
              )}
              {activeSection === 'security' && (
                <SectionPane key="security">
                  <SecuritySection
                    profile={profile}
                    showToast={showToast}
                    onPhoneVerified={() => setProfile(p => p ? { ...p, isPhoneVerified: true } : p)}
                  />
                </SectionPane>
              )}
              {activeSection === 'account' && (
                <SectionPane key="account">
                  <AccountSection roles={roles} showToast={showToast} />
                </SectionPane>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </div>
  )
}

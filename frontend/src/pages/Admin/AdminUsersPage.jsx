import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listAdminUsers, banUser, unbanUser, deleteUser } from '../../services/Admin/adminUserService'
import { parseApiError } from '../../utils/errorUtils'

const PAGE_SIZE = 20

const ROLE_OPTIONS = [
  { value: '',           label: 'All roles'   },
  { value: 'Player',     label: 'Player'      },
  { value: 'PitchOwner', label: 'Pitch Owner' },
  { value: 'Admin',      label: 'Admin'       },
]

const BAN_OPTIONS = [
  { value: '',      label: 'All users'  },
  { value: 'false', label: 'Active'     },
  { value: 'true',  label: 'Banned'     },
]

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`
      fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4
      rounded-xl shadow-2xl border text-sm font-medium
      ${type === 'success'
        ? 'bg-[#0f1a12] border-green-600 text-green-400'
        : 'bg-[#1a0f0f] border-red-600 text-red-400'
      }
    `}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close"
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity">×</button>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse" />
      ))}
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const cls = {
    Player:     'bg-blue-500/10 border-blue-500/30 text-blue-400',
    PitchOwner: 'bg-green-500/10 border-green-500/30 text-green-400',
    Admin:      'bg-purple-500/10 border-purple-500/30 text-purple-400',
  }[role] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400'

  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
      {role === 'PitchOwner' ? 'Pitch Owner' : role}
    </span>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

const CONFIRM_COPY = {
  ban: {
    title:   'Ban user?',
    confirm: 'Ban user',
    danger:  true,
    body: u => <>Are you sure you want to ban <span className="text-white font-medium">{u.username}</span>? They will not be able to log in.</>,
  },
  unban: {
    title:   'Unban user?',
    confirm: 'Unban user',
    danger:  false,
    body: u => <>Are you sure you want to unban <span className="text-white font-medium">{u.username}</span>? They will regain access immediately.</>,
  },
  delete: {
    title:   'Delete user?',
    confirm: 'Delete account',
    danger:  true,
    body: u => <>Permanently delete <span className="text-white font-medium">{u.username}</span>? Their personal data is removed, any pitches they own are taken down, and they are logged out. This cannot be undone, though the email can be used to register a new account later.</>,
  },
}

function ConfirmModal({ user, action, onConfirm, onCancel, loading }) {
  const copy = CONFIRM_COPY[action] ?? CONFIRM_COPY.ban

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !loading) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, loading])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-6">
        <p className="text-base font-bold text-white mb-1">{copy.title}</p>
        <p className="text-sm text-neutral-400 mb-6">{copy.body(user)}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#141414]
                       border border-[#1f1f1f] text-neutral-400 hover:text-white
                       hover:border-white/15 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${copy.danger
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/25'
              }`}
          >
            {loading ? 'Processing…' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ user, onAction, isProcessing }) {
  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : '??'
  const isAdmin = user.roles?.includes('Admin')
  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className={`
      flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors
      ${user.isBanned
        ? 'border-red-900/30 bg-red-500/5'
        : 'border-[#1f1f1f] bg-[#0d0d0d] hover:border-white/10'
      }
    `}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/10
                      flex items-center justify-center text-[11px] font-bold text-neutral-400 shrink-0">
        {initials}
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-white truncate">{user.username}</span>
          {user.isBanned && (
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold
                             bg-red-500/10 border-red-500/30 text-red-400">
              Banned
            </span>
          )}
        </div>
        <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
      </div>

      {/* Roles */}
      <div className="hidden sm:flex items-center gap-1.5 flex-wrap shrink-0">
        {user.roles && user.roles.length > 0
          ? user.roles.map(r => <RoleBadge key={r} role={r} />)
          : <span className="text-[11px] text-neutral-600">No role</span>
        }
      </div>

      {/* Joined */}
      <p className="hidden md:block text-[11px] text-neutral-600 shrink-0 w-28 text-right">
        {fmtDate(user.createdAt)}
      </p>

      {/* Action */}
      <div className="shrink-0 flex items-center gap-2">
        {isAdmin ? (
          <span className="text-[11px] text-neutral-600 italic">Protected</span>
        ) : (
          <>
            {user.isBanned ? (
              <button
                onClick={() => onAction(user, 'unban')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold
                           bg-green-500/15 border border-green-500/40 text-green-400
                           hover:bg-green-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Unban
              </button>
            ) : (
              <button
                onClick={() => onAction(user, 'ban')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold
                           bg-[#141414] border border-red-900/40 text-red-500
                           hover:bg-red-500/10 hover:border-red-500/40
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ban
              </button>
            )}
            <button
              onClick={() => onAction(user, 'delete')}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold
                         bg-[#141414] border border-[#2a2a2a] text-neutral-500
                         hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button onClick={onPrev} disabled={page <= 1}
        className="rounded-lg px-4 py-2 text-xs font-semibold bg-[#0d0d0d] border border-[#1f1f1f]
                   text-neutral-300 hover:text-white hover:border-white/15 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed">
        ← Prev
      </button>
      <span className="text-xs text-neutral-500">
        Page <span className="text-white font-semibold">{page}</span> of{' '}
        <span className="text-white font-semibold">{totalPages}</span>
      </span>
      <button onClick={onNext} disabled={page >= totalPages}
        className="rounded-lg px-4 py-2 text-xs font-semibold bg-[#0d0d0d] border border-[#1f1f1f]
                   text-neutral-300 hover:text-white hover:border-white/15 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed">
        Next →
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState(null)
  const [page,        setPage]        = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [totalCount,  setTotalCount]  = useState(0)
  const [roleFilter,  setRoleFilter]  = useState('')
  const [banFilter,   setBanFilter]   = useState('')
  const [toast,       setToast]       = useState(null)
  const [confirm,     setConfirm]     = useState(null)
  const [processing,  setProcessing]  = useState(false)

  const closeToast = useCallback(() => setToast(null), [])

  const fetchUsers = useCallback(async (targetPage, role, banned) => {
    setIsLoading(true)
    setError(null)
    try {
      const roleParam   = role   || null
      const bannedParam = banned === '' ? null : banned === 'true'
      const data = await listAdminUsers(targetPage, PAGE_SIZE, roleParam, bannedParam)
      setUsers(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalCount(data.totalCount ?? 0)
    } catch (err) {
      setError(parseApiError(err, 'Failed to load users.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page, roleFilter, banFilter)
  }, [fetchUsers, page, roleFilter, banFilter])

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const handleAction = (user, action) => {
    setConfirm({ user, action })
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setProcessing(true)
    try {
      if (confirm.action === 'ban') {
        await banUser(confirm.user.id)
        setToast({ message: `${confirm.user.username} has been banned.`, type: 'success' })
      } else if (confirm.action === 'delete') {
        await deleteUser(confirm.user.id)
        setToast({ message: `${confirm.user.username} has been deleted.`, type: 'success' })
      } else {
        await unbanUser(confirm.user.id)
        setToast({ message: `${confirm.user.username} has been unbanned.`, type: 'success' })
      }
      setConfirm(null)
      await fetchUsers(page, roleFilter, banFilter)
    } catch (err) {
      setToast({ message: parseApiError(err, 'Action failed.'), type: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  const selectCls = `rounded-lg bg-[#0d0d0d] border border-[#1f1f1f] px-3 py-2 text-xs
                     text-neutral-300 focus:outline-none focus:border-white/20 transition-colors`

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">Admin Panel</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">User Management</h1>
      </div>

      {/* Admin nav */}
      <div className="flex gap-1 mb-8 border-b border-[#1f1f1f]">
        <Link to="/admin/pitches"
          className="px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors
                     border-transparent text-neutral-500 hover:text-white">
          Pitch Approvals
        </Link>
        <Link to="/admin/users"
          className="px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors
                     border-green-500 text-green-400">
          Users
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={roleFilter}
          onChange={handleFilterChange(setRoleFilter)}
          className={selectCls}
        >
          {ROLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={banFilter}
          onChange={handleFilterChange(setBanFilter)}
          className={selectCls}
        >
          {BAN_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {!isLoading && !error && (
          <span className="text-xs text-neutral-500 ml-auto">
            {totalCount} {totalCount === 1 ? 'user' : 'users'}
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading && <TableSkeleton />}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => fetchUsers(page, roleFilter, banFilter)}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold bg-[#141414]
                       border border-[#1f1f1f] text-white hover:border-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && users.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-12 text-center">
          <p className="text-base font-semibold text-white">No users found</p>
          <p className="text-sm text-neutral-500 mt-1">Try adjusting the filters.</p>
        </div>
      )}

      {!isLoading && !error && users.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {users.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onAction={handleAction}
                isProcessing={processing}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage(n => Math.max(1, n - 1))}
            onNext={() => setPage(n => n + 1)}
          />
        </>
      )}

      {confirm && (
        <ConfirmModal
          user={confirm.user}
          action={confirm.action}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={processing}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}

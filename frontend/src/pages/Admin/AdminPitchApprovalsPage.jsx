import { useState, useEffect, useCallback } from 'react'
import {
  listPendingPitches, approvePitch, rejectPitch,
  listPendingRoleRequests, approveRoleRequest, rejectRoleRequest,
} from '../../services/Admin/adminService'
import { parseApiError } from '../../utils/errorUtils'
import PitchCover from '../../components/Pitch/PitchCover'
import GalleryModal from '../../components/Pitch/GalleryModal'

const PITCH_PAGE_SIZE = 15
const ROLE_PAGE_SIZE  = 15

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

// ── Shared ────────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse" />
      ))}
    </div>
  )
}

function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
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

// ── Pitch Approvals tab ───────────────────────────────────────────────────────

function PitchApprovalCard({ pitch, onApprove, onReject, onPreview, isProcessing }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')

  const handleRejectConfirm = () => {
    onReject(pitch.id, reason.trim() || null)
    setRejecting(false)
    setReason('')
  }

  const createdDate = new Date(pitch.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="flex overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] hover:border-white/10 transition-colors">
      <button
        type="button"
        onClick={() => onPreview(pitch)}
        disabled={!pitch.images || pitch.images.length === 0}
        aria-label={`Preview images for ${pitch.name}`}
        className="hidden sm:block w-[130px] flex-shrink-0 bg-[#0a0a0a] group cursor-zoom-in
                   disabled:cursor-default"
      >
        <PitchCover
          imageUrl={pitch.coverImageUrl}
          sport={pitch.sportName}
          imageCount={pitch.images?.length ?? 0}
          className="w-full h-full"
        />
      </button>
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-white truncate">{pitch.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {pitch.sportName} · {pitch.cityName} · {pitch.address}
            </p>
          </div>
          <div className="font-bold text-green-400 whitespace-nowrap text-sm">
            ${pitch.pricePerHour}
            <span className="text-xs text-neutral-500 font-normal">/hr</span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-neutral-500">👤 {pitch.ownerName}</span>
          <span className="text-[11px] text-neutral-600">·</span>
          <span className="text-[11px] text-neutral-500">Submitted {createdDate}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!rejecting && (
            <>
              <button onClick={() => onApprove(pitch.id)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-green-500/15
                           border border-green-500/40 text-green-400 hover:bg-green-500/25
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Processing…' : '✓ Approve'}
              </button>
              <button onClick={() => setRejecting(true)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#141414]
                           border border-red-900/40 text-red-500 hover:bg-red-500/10
                           hover:border-red-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ✕ Reject
              </button>
            </>
          )}
        </div>
        {rejecting && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-[11px] text-red-400 font-semibold mb-2 uppercase tracking-wide">Rejection reason</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Optional — explain what the owner needs to fix…" rows={2}
              className="w-full bg-transparent text-xs text-white placeholder-neutral-600 resize-none outline-none leading-relaxed" />
            <div className="mt-3 flex gap-2">
              <button onClick={handleRejectConfirm} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-500/20
                           border border-red-500/50 text-red-400 hover:bg-red-500/30
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => { setRejecting(false); setReason('') }} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#141414]
                           border border-[#1f1f1f] text-neutral-400 hover:text-white
                           hover:border-white/15 transition-colors disabled:opacity-40">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PitchApprovalsTab({ setToast }) {
  const [pitches,      setPitches]      = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState(null)
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalPending, setTotalPending] = useState(0)
  const [processingId, setProcessingId] = useState(null)
  const [previewPitch, setPreviewPitch] = useState(null)

  const closePreview = useCallback(() => setPreviewPitch(null), [])

  const fetchPending = useCallback(async (targetPage) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listPendingPitches(targetPage, PITCH_PAGE_SIZE)
      setPitches(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalPending(data.totalCount ?? 0)
    } catch (err) {
      setError(parseApiError(err, 'Failed to load pending pitches.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending(page) }, [fetchPending, page])

  // After a mutation: if we just cleared the last item on a non-first page,
  // step back one page (the useEffect will refetch). Otherwise refetch the
  // current page so a row from page N+1 rotates up into the now-empty slot.
  const refreshAfterMutation = useCallback(async () => {
    if (pitches.length === 1 && page > 1) {
      setPage(p => p - 1)
    } else {
      await fetchPending(page)
    }
  }, [pitches.length, page, fetchPending])

  const handleApprove = useCallback(async (id) => {
    setProcessingId(id)
    try {
      await approvePitch(id)
      setToast({ message: 'Pitch approved — it is now live on the platform.', type: 'success' })
      await refreshAfterMutation()
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to approve pitch.'), type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }, [refreshAfterMutation, setToast])

  const handleReject = useCallback(async (id, reason) => {
    setProcessingId(id)
    try {
      await rejectPitch(id, reason)
      setToast({ message: 'Pitch rejected. The owner has been notified.', type: 'success' })
      await refreshAfterMutation()
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to reject pitch.'), type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }, [refreshAfterMutation, setToast])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">Review new pitch listings before they go live.</p>
        {!isLoading && !error && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10
                          border border-amber-500/25 px-4 py-2 text-sm font-semibold text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            {totalPending} pending
          </div>
        )}
      </div>

      {isLoading && <CardSkeleton />}
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => fetchPending(page)}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold bg-[#141414]
                       border border-[#1f1f1f] text-white hover:border-white/15 transition-colors">
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && pitches.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-12 text-center">
          <p className="text-base font-semibold text-white">Queue is clear</p>
          <p className="text-sm text-neutral-500 mt-1">No pitches are waiting for review right now.</p>
        </div>
      )}
      {!isLoading && !error && pitches.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {pitches.map(p => (
              <PitchApprovalCard key={p.id} pitch={p}
                onApprove={handleApprove} onReject={handleReject}
                onPreview={setPreviewPitch}
                isProcessing={processingId === p.id} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages}
            onPrev={() => setPage(n => Math.max(1, n - 1))}
            onNext={() => setPage(n => n + 1)} />
        </>
      )}

      {previewPitch && (
        <GalleryModal
          images={previewPitch.images ?? []}
          title={previewPitch.name}
          onClose={closePreview}
        />
      )}
    </>
  )
}

// ── Role Requests tab ─────────────────────────────────────────────────────────

function RoleRequestCard({ request, onApprove, onReject, isProcessing }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')

  const handleRejectConfirm = () => {
    onReject(request.id, reason.trim() || null)
    setRejecting(false)
    setReason('')
  }

  const fmtDate = d => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="flex overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] hover:border-white/10 transition-colors">
      <div className="hidden sm:flex w-[130px] flex-shrink-0 items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 rounded-full bg-[var(--green-muted)] border border-[var(--green-border)]
                        flex items-center justify-center text-[var(--green)] text-xl font-bold">
          {(request.username?.[0] ?? '?').toUpperCase()}
        </div>
      </div>
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-white">{request.username}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{request.email}</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase
                           bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]">
            → {request.requestedRole === 'PitchOwner' ? 'Pitch Owner' : request.requestedRole}
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 mt-2">Requested {fmtDate(request.createdAt)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!rejecting && (
            <>
              <button onClick={() => onApprove(request.id)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-green-500/15
                           border border-green-500/40 text-green-400 hover:bg-green-500/25
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Processing…' : '✓ Approve'}
              </button>
              <button onClick={() => setRejecting(true)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#141414]
                           border border-red-900/40 text-red-500 hover:bg-red-500/10
                           hover:border-red-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ✕ Reject
              </button>
            </>
          )}
        </div>
        {rejecting && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-[11px] text-red-400 font-semibold mb-2 uppercase tracking-wide">Rejection reason</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Optional — explain why the request was denied…" rows={2}
              className="w-full bg-transparent text-xs text-white placeholder-neutral-600 resize-none outline-none leading-relaxed" />
            <div className="mt-3 flex gap-2">
              <button onClick={handleRejectConfirm} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-500/20
                           border border-red-500/50 text-red-400 hover:bg-red-500/30
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => { setRejecting(false); setReason('') }} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#141414]
                           border border-[#1f1f1f] text-neutral-400 hover:text-white
                           hover:border-white/15 transition-colors disabled:opacity-40">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RoleRequestsTab({ setToast }) {
  const [requests,     setRequests]     = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState(null)
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalPending, setTotalPending] = useState(0)
  const [processingId, setProcessingId] = useState(null)

  const fetchRequests = useCallback(async (targetPage) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listPendingRoleRequests(targetPage, ROLE_PAGE_SIZE)
      setRequests(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalPending(data.totalCount ?? 0)
    } catch (err) {
      setError(parseApiError(err, 'Failed to load role requests.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests(page) }, [fetchRequests, page])

  const removeFromList = (id) => setRequests(prev => prev.filter(r => r.id !== id))

  const handleApprove = useCallback(async (id) => {
    setProcessingId(id)
    try {
      await approveRoleRequest(id)
      removeFromList(id)
      setTotalPending(n => Math.max(0, n - 1))
      setToast({ message: 'Role request approved. The user now has the new role.', type: 'success' })
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to approve request.'), type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }, [setToast])

  const handleReject = useCallback(async (id, reason) => {
    setProcessingId(id)
    try {
      await rejectRoleRequest(id, reason)
      removeFromList(id)
      setTotalPending(n => Math.max(0, n - 1))
      setToast({ message: 'Role request rejected.', type: 'success' })
    } catch (err) {
      setToast({ message: parseApiError(err, 'Failed to reject request.'), type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }, [setToast])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">Review requests from users wanting to expand their roles.</p>
        {!isLoading && !error && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10
                          border border-amber-500/25 px-4 py-2 text-sm font-semibold text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            {totalPending} pending
          </div>
        )}
      </div>

      {isLoading && <CardSkeleton />}
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => fetchRequests(page)}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold bg-[#141414]
                       border border-[#1f1f1f] text-white hover:border-white/15 transition-colors">
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && requests.length === 0 && (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-12 text-center">
          <p className="text-base font-semibold text-white">No pending requests</p>
          <p className="text-sm text-neutral-500 mt-1">No users are waiting for role approval right now.</p>
        </div>
      )}
      {!isLoading && !error && requests.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {requests.map(r => (
              <RoleRequestCard key={r.id} request={r}
                onApprove={handleApprove} onReject={handleReject}
                isProcessing={processingId === r.id} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages}
            onPrev={() => setPage(n => Math.max(1, n - 1))}
            onNext={() => setPage(n => n + 1)} />
        </>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPitchApprovalsPage() {
  const [activeTab, setActiveTab] = useState('pitches')
  const [toast,     setToast]     = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const tabs = [
    { key: 'pitches',      label: 'Pitch Approvals' },
    { key: 'roleRequests', label: 'Role Requests'   },
  ]

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10 text-white">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-green-500">Admin Panel</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {activeTab === 'pitches' ? 'Pitch Approvals' : 'Role Requests'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#1f1f1f]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors
              ${activeTab === tab.key
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-neutral-500 hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pitches'
        ? <PitchApprovalsTab setToast={setToast} />
        : <RoleRequestsTab   setToast={setToast} />
      }

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}

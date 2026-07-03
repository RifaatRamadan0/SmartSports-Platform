import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/routing/PageWrapper'
import {
  listPendingPitches, approvePitch, rejectPitch,
  listPendingRoleRequests, approveRoleRequest, rejectRoleRequest,
} from '../../services/Admin/adminService'
import { parseApiError } from '../../utils/errorUtils'
import { useToast } from '../../context/ToastContext'
import PitchCover from '../../components/Pitch/PitchCover'
import GalleryModal from '../../components/Pitch/GalleryModal'
import { ListSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

const PITCH_PAGE_SIZE = 15
const ROLE_PAGE_SIZE  = 15

// ── Shared ────────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <button onClick={onPrev} disabled={page <= 1}
        className="rounded-lg px-4 py-2 text-xs font-semibold bg-[var(--surface)] border border-[var(--bg3)]
                   text-[var(--text2)] hover:text-white hover:border-white/15 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed">
        ← Prev
      </button>
      <span className="text-xs text-[var(--text3)]">
        Page <span className="text-white font-semibold">{page}</span> of{' '}
        <span className="text-white font-semibold">{totalPages}</span>
      </span>
      <button onClick={onNext} disabled={page >= totalPages}
        className="rounded-lg px-4 py-2 text-xs font-semibold bg-[var(--surface)] border border-[var(--bg3)]
                   text-[var(--text2)] hover:text-white hover:border-white/15 transition-colors
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
    <div className="flex overflow-hidden rounded-2xl border border-white/[0.06] bg-[var(--surface)] hover:border-white/10 transition-colors">
      <button
        type="button"
        onClick={() => onPreview(pitch)}
        disabled={!pitch.images || pitch.images.length === 0}
        aria-label={`Preview images for ${pitch.name}`}
        className="hidden sm:block w-[130px] flex-shrink-0 bg-[var(--bg)] group cursor-zoom-in
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
            <p className="text-xs text-[var(--text2)] mt-0.5 truncate">
              {pitch.sportName} · {pitch.cityName} · {pitch.address}
            </p>
          </div>
          <div className="font-bold text-[var(--green)] whitespace-nowrap text-sm">
            ${pitch.pricePerHour}
            <span className="text-xs text-[var(--text2)] font-normal">/hr</span>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-[var(--text2)]">👤 {pitch.ownerName}</span>
          <span className="text-[11px] text-[var(--text3)]">·</span>
          <span className="text-[11px] text-[var(--text2)]">Submitted {createdDate}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!rejecting && (
            <>
              <button onClick={() => onApprove(pitch.id)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--green)]/15
                           border border-[var(--green)]/40 text-[var(--green)] hover:bg-[var(--green)]/25
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Processing…' : '✓ Approve'}
              </button>
              <button onClick={() => setRejecting(true)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--bg3)]
                           border border-[var(--red-border)] text-[var(--red)] hover:bg-[var(--red)]/10
                           hover:border-[var(--red-border)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ✕ Reject
              </button>
            </>
          )}
        </div>
        {rejecting && (
          <div className="mt-3 rounded-xl border border-[var(--red-border)] bg-[var(--red)]/5 p-3">
            <p className="text-[11px] text-[var(--red)] font-semibold mb-2 uppercase tracking-wide">Rejection reason</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Optional — explain what the owner needs to fix…" rows={2}
              className="w-full bg-[var(--bg)] text-xs text-white placeholder-[var(--text3)] resize-none outline-none leading-relaxed rounded border border-white/[0.07]" />
            <div className="mt-3 flex gap-2">
              <button onClick={handleRejectConfirm} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--red)]/20
                           border border-[var(--red-border)] text-[var(--red)] hover:bg-[var(--red)]/30
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => { setRejecting(false); setReason('') }} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--bg3)]
                           border border-white/[0.07] text-[var(--text2)] hover:text-white
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

function PitchApprovalsTab() {
  const { success, error } = useToast()
  const [pitches,      setPitches]      = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalPending, setTotalPending] = useState(0)
  const [processingId, setProcessingId] = useState(null)
  const [previewPitch, setPreviewPitch] = useState(null)

  const closePreview = useCallback(() => setPreviewPitch(null), [])

  const fetchPending = useCallback(async (targetPage) => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listPendingPitches(targetPage, PITCH_PAGE_SIZE)
      setPitches(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalPending(data.totalCount ?? 0)
    } catch (err) {
      setLoadError(parseApiError(err, 'Failed to load pending pitches.'))
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
      success('Pitch approved — it is now live on the platform.')
      await refreshAfterMutation()
    } catch (err) {
      error(parseApiError(err, 'Failed to approve pitch.'))
    } finally {
      setProcessingId(null)
    }
  }, [refreshAfterMutation, success, error])

  const handleReject = useCallback(async (id, reason) => {
    setProcessingId(id)
    try {
      await rejectPitch(id, reason)
      success('Pitch rejected. The owner has been notified.')
      await refreshAfterMutation()
    } catch (err) {
      error(parseApiError(err, 'Failed to reject pitch.'))
    } finally {
      setProcessingId(null)
    }
  }, [refreshAfterMutation, success, error])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[var(--text3)]">Review new pitch listings before they go live.</p>
        {!isLoading && !loadError && (
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

      {isLoading && <ListSkeleton count={4} height="h-32" />}
      {!isLoading && loadError && (
        <div className="rounded-2xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-6 text-center">
          <p className="text-sm text-[var(--red)]">{loadError}</p>
          <button onClick={() => fetchPending(page)}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold bg-[var(--bg3)]
                       border border-[var(--bg3)] text-white hover:border-white/15 transition-colors">
            Retry
          </button>
        </div>
      )}
      {!isLoading && !loadError && pitches.length === 0 && (
        <EmptyState icon="✅" title="Queue is clear" message="No pitches are waiting for review right now." />
      )}
      {!isLoading && !loadError && pitches.length > 0 && (
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
    <div className="flex overflow-hidden rounded-2xl border border-[var(--bg3)] bg-[var(--surface)] hover:border-white/10 transition-colors">
      <div className="hidden sm:flex w-[130px] flex-shrink-0 items-center justify-center bg-[var(--bg)]">
        <div className="w-12 h-12 rounded-full bg-[var(--green-muted)] border border-[var(--green-border)]
                        flex items-center justify-center text-[var(--green)] text-xl font-bold">
          {(request.username?.[0] ?? '?').toUpperCase()}
        </div>
      </div>
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight text-white">{request.username}</h3>
            <p className="text-xs text-[var(--text3)] mt-0.5">{request.email}</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase
                           bg-[var(--green-muted)] border-[var(--green-border)] text-[var(--green)]">
            → {request.requestedRole === 'PitchOwner' ? 'Pitch Owner' : request.requestedRole}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text3)] mt-2">Requested {fmtDate(request.createdAt)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!rejecting && (
            <>
              <button onClick={() => onApprove(request.id)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--green)]/15
                           border border-[var(--green)]/40 text-[var(--green)] hover:bg-[var(--green)]/25
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Processing…' : '✓ Approve'}
              </button>
              <button onClick={() => setRejecting(true)} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--bg3)]
                           border border-[var(--red)]/40 text-[var(--red)] hover:bg-[var(--red)]/10
                           hover:border-[var(--red)]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                ✕ Reject
              </button>
            </>
          )}
        </div>
        {rejecting && (
          <div className="mt-3 rounded-xl border border-[var(--red)]/20 bg-[var(--red)]/5 p-3">
            <p className="text-[11px] text-[var(--red)] font-semibold mb-2 uppercase tracking-wide">Rejection reason</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Optional — explain why the request was denied…" rows={2}
              className="w-full bg-transparent text-xs text-white placeholder-[var(--text3)] resize-none outline-none leading-relaxed" />
            <div className="mt-3 flex gap-2">
              <button onClick={handleRejectConfirm} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--red)]/20
                           border border-[var(--red)]/50 text-[var(--red)] hover:bg-[var(--red)]/30
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => { setRejecting(false); setReason('') }} disabled={isProcessing}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[var(--bg3)]
                           border border-[var(--bg3)] text-[var(--text2)] hover:text-white
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

function RoleRequestsTab() {
  const { success, error } = useToast()
  const [requests,     setRequests]     = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalPending, setTotalPending] = useState(0)
  const [processingId, setProcessingId] = useState(null)

  const fetchRequests = useCallback(async (targetPage) => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listPendingRoleRequests(targetPage, ROLE_PAGE_SIZE)
      setRequests(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotalPending(data.totalCount ?? 0)
    } catch (err) {
      setLoadError(parseApiError(err, 'Failed to load role requests.'))
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
      success('Role request approved. The user now has the new role.')
    } catch (err) {
      error(parseApiError(err, 'Failed to approve request.'))
    } finally {
      setProcessingId(null)
    }
  }, [success, error])

  const handleReject = useCallback(async (id, reason) => {
    setProcessingId(id)
    try {
      await rejectRoleRequest(id, reason)
      removeFromList(id)
      setTotalPending(n => Math.max(0, n - 1))
      success('Role request rejected.')
    } catch (err) {
      error(parseApiError(err, 'Failed to reject request.'))
    } finally {
      setProcessingId(null)
    }
  }, [success, error])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[var(--text3)]">Review requests from users wanting to expand their roles.</p>
        {!isLoading && !loadError && (
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

      {isLoading && <ListSkeleton count={4} height="h-32" />}
      {!isLoading && loadError && (
        <div className="rounded-2xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-6 text-center">
          <p className="text-sm text-[var(--red)]">{loadError}</p>
          <button onClick={() => fetchRequests(page)}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold bg-[var(--bg3)]
                       border border-[var(--bg3)] text-white hover:border-white/15 transition-colors">
            Retry
          </button>
        </div>
      )}
      {!isLoading && !loadError && requests.length === 0 && (
        <EmptyState icon="✅" title="No pending requests" message="No users are waiting for role approval right now." />
      )}
      {!isLoading && !loadError && requests.length > 0 && (
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

  const tabs = [
    { key: 'pitches',      label: 'Pitch Approvals' },
    { key: 'roleRequests', label: 'Role Requests'   },
  ]

  return (
    <PageWrapper className="min-h-screen bg-[var(--bg)] px-6 py-10 text-white">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--green)]">Admin Panel</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {activeTab === 'pitches' ? 'Pitch Approvals' : 'Role Requests'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[var(--bg3)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors
              ${activeTab === tab.key
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text3)] hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
        <Link to="/admin/users"
          className="px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors
                     border-transparent text-[var(--text3)] hover:text-white ml-2">
          Users
        </Link>
      </div>

      {/* Tab content */}
      {activeTab === 'pitches'
        ? <PitchApprovalsTab />
        : <RoleRequestsTab />
      }
    </PageWrapper>
  )
}

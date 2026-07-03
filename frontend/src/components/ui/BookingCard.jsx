import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { listItemVariants } from '../../lib/motion'

export default function BookingCard({ booking, onClick, onCancel, isCancelling, isCancellable }) {
  const fmtTime = t => t?.slice(0, 5) ?? ''
  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const statusColor = {
    confirmed: 'text-[var(--green)] bg-[var(--green-muted)] border-[var(--green-border)]',
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    cancelled: 'text-[var(--text2)] bg-white/[0.05] border-white/[0.07]',
  }[booking.status] || 'text-[var(--text2)]'

  const statusLabel = {
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
  }[booking.status] || booking.status

  return (
    <motion.div
      variants={listItemVariants}
      onClick={onClick}
      className="rounded-2xl border border-white/[0.06] bg-[var(--surface)] overflow-hidden
                 hover:border-[var(--green-border)] hover:bg-[var(--bg3)] transition-all duration-200 cursor-pointer
                 border-l-4 border-l-[var(--green)] group"
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header: Pitch name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate group-hover:text-[var(--green)] transition-colors">
              {booking.pitchName}
            </p>
          </div>
          <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Date, time, location with icons */}
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--text2)]">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0 text-[var(--text3)]" />
            <span>{fmtDate(booking.bookingDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="shrink-0 text-[var(--text3)]" />
            <span>{fmtTime(booking.startTime)} - {fmtTime(booking.endTime)}</span>
          </div>
          {booking.cityName && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0 text-[var(--text3)]" />
              <span>{booking.cityName}</span>
            </div>
          )}
        </div>

        {/* Price and action */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <p className="text-sm font-bold text-white">
            ${Number(booking.totalPrice).toFixed(2)}
          </p>
          {isCancellable && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              disabled={isCancelling}
              className="text-xs font-semibold text-[var(--text2)] hover:text-[var(--red)]
                         px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[var(--red-border)]
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

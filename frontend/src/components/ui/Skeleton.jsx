import { motion } from 'framer-motion'
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props} />
  );
}

export function ListSkeleton({ count = 5, height = 'h-20', gap = 'gap-3' }) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${height} rounded-2xl bg-[var(--surface)] border border-white/[0.06]`}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 6, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', height = 'h-[300px]', gap = 'gap-5' }) {
  return (
    <div className={`grid ${cols} ${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${height} rounded-3xl border border-white/[0.06] bg-[var(--surface)]`}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton({ delay = 0 }) {
  const s = `${delay}s`
  return (
    <div className="bg-card border border-border rounded-[20px] overflow-hidden animate-pulse" style={{ animationDelay: s }}>
      {/* head */}
      <div className="p-5 pb-[18px] space-y-3 bg-muted/20">
        <div className="flex justify-between">
          <div className="h-5 w-16 rounded-full bg-muted" style={{ animationDelay: s }} />
          <div className="h-5 w-14 rounded-full bg-muted" style={{ animationDelay: `${delay + 0.05}s` }} />
        </div>
        <div className="h-5 w-[62%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
        <div className="h-3.5 w-[48%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
      </div>
      {/* fill section */}
      <div className="px-5 pt-3.5 pb-3.5 border-t border-border space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-[55%] rounded bg-muted" />
          <div className="h-3 w-[30%] rounded bg-muted" />
        </div>
        <div className="h-[6px] rounded-full bg-muted" />
      </div>
      {/* body */}
      <div className="px-5 py-3.5 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-[55%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
          <div className="h-4 w-[40%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-[55%] rounded bg-muted" style={{ animationDelay: `${delay + 0.1}s` }} />
          <div className="h-4 w-[40%] rounded bg-muted" style={{ animationDelay: `${delay + 0.15}s` }} />
        </div>
      </div>
      {/* footer */}
      <div className="px-5 pb-5 pt-3.5 border-t border-border flex gap-3">
        <div className="h-9 flex-1 rounded-xl bg-muted" style={{ animationDelay: `${delay + 0.2}s` }} />
        <div className="h-9 flex-1 rounded-xl bg-muted" style={{ animationDelay: `${delay + 0.2}s` }} />
      </div>
    </div>
  )
}

export { Skeleton }

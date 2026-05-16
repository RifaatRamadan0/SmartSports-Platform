import StarRating from '../ui/StarRating'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ReviewCard({ review }) {
  const initial = review.reviewerName ? review.reviewerName[0].toUpperCase() : '?'

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center
                          text-xs font-bold text-[var(--primary-foreground)] shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{review.reviewerName}</p>
            <p className="text-[11px] text-[var(--text3)] mt-0.5">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-3 text-sm text-[var(--text2)] leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

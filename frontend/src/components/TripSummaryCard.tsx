import type { BalanceSummary } from '../types'
import { formatCurrency } from '../utils'

interface TripSummaryProps {
  summary: BalanceSummary | null
  currency: string
  loading?: boolean
}

export function TripSummaryCard({ summary, currency, loading }: TripSummaryProps) {
  if (loading && !summary) {
    return (
      <section className="mb-5 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
        <p className="text-sm text-stone-muted">Loading summary…</p>
      </section>
    )
  }

  if (!summary) return null

  return (
    <section className="mb-5 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-muted">
            Total spent
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-pine-900">
            {formatCurrency(summary.total_expense, currency)}
          </p>
        </div>
        <p className="text-xs text-stone-muted">{summary.member_count} people</p>
      </div>

      {summary.balances.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-stone-line pt-3">
          {summary.balances.map((row) => (
            <li
              key={row.member_id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="font-medium text-pine-950">{row.member_name}</span>
              <span className="text-right text-stone-muted">
                Paid {formatCurrency(row.total_paid, currency)}
                <span className="mx-1.5 text-stone-line">·</span>
                Share {formatCurrency(row.share, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

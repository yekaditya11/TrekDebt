import type { BalanceSummary } from '../types'
import { formatCurrency } from '../utils'

interface TripSummaryProps {
  summary: BalanceSummary | null
  currency: string
  loading?: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function TripSummaryCard({ summary, currency, loading }: TripSummaryProps) {
  if (loading && !summary) {
    return (
      <section className="mb-6 px-1">
        <p className="text-sm text-stone-muted">…</p>
      </section>
    )
  }

  if (!summary) return null

  return (
    <section className="mb-6">
      <p className="font-display text-4xl font-extrabold tracking-tight text-pine-950">
        {formatCurrency(summary.total_expense, currency)}
      </p>
      <p className="mt-1 text-sm text-stone-muted">{summary.member_count} people</p>

      {summary.balances.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {summary.balances.map((row) => (
            <li key={row.member_id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-100 text-xs font-bold text-pine-800">
                {initials(row.member_name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-pine-950">
                {row.member_name}
              </span>
              <span className="shrink-0 font-display text-base font-bold tabular-nums text-pine-800">
                {formatCurrency(row.total_paid, currency)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

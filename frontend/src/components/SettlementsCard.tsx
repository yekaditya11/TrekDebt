import type { SettlementTransaction } from '../types'
import { formatCurrency } from '../utils'

interface SettlementsCardProps {
  settlements: SettlementTransaction[]
  currency: string
}

export function SettlementsCard({ settlements, currency }: SettlementsCardProps) {
  if (settlements.length === 0) return null

  return (
    <section className="mb-5 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
      <h2 className="text-sm font-semibold text-pine-950">Settle up</h2>
      <p className="mt-1 text-xs text-stone-muted">Suggested payments to even things out.</p>
      <ul className="mt-3 space-y-2">
        {settlements.map((row) => (
          <li
            key={`${row.from_member_id}-${row.to_member_id}-${row.amount}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-pine-900">
              <span className="font-semibold">{row.from_member_name}</span>
              {' pays '}
              <span className="font-semibold">{row.to_member_name}</span>
            </span>
            <span className="shrink-0 font-display font-bold text-pine-800">
              {formatCurrency(row.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

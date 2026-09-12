import type { SettlementTransaction } from '../types'
import { formatCurrency } from '../utils'

interface SettlementsCardProps {
  settlements: SettlementTransaction[]
  currency: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-100 text-sm font-bold text-pine-800"
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function SettlementsCard({ settlements, currency }: SettlementsCardProps) {
  if (settlements.length === 0) {
    return (
      <section className="px-1 py-10 text-center">
        <p className="font-display text-2xl font-bold text-pine-950">You're all even</p>
        <p className="mt-2 text-sm text-stone-muted">Nothing left to settle.</p>
      </section>
    )
  }

  return (
    <section>
      <header className="mb-5 px-1">
        <h2 className="font-display text-2xl font-bold text-pine-950">Settle up</h2>
        <p className="mt-1 text-sm text-stone-muted">
          {settlements.length} payment{settlements.length === 1 ? '' : 's'} to balance
        </p>
      </header>

      <ul className="space-y-3">
        {settlements.map((row) => (
          <li
            key={`${row.from_member_id}-${row.to_member_id}-${row.amount}`}
            className="rounded-3xl border border-stone-line/70 bg-panel px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <Avatar name={row.from_member_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold text-pine-950">
                  {row.from_member_name}
                </p>
                <p className="mt-0.5 truncate text-sm text-stone-muted">
                  pays <span className="font-semibold text-pine-900">{row.to_member_name}</span>
                </p>
              </div>
              <p className="shrink-0 font-display text-xl font-bold tabular-nums text-pine-700">
                {formatCurrency(row.amount, currency)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

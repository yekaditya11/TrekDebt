import type { BalanceSummary } from '../types'
import { formatCurrency } from '../utils'
import { EmptyState } from './States'

export function Dashboard({ summary }: { summary: BalanceSummary }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total spent" value={formatCurrency(summary.total_expense)} />
        <Stat label="Per person" value={formatCurrency(summary.per_person_share)} highlight />
      </div>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-pine-950">Balances</h3>
        <ul className="space-y-2">
          {summary.balances.map((balance) => {
            const net = Number(balance.net_balance)
            const label =
              net > 0
                ? `To receive ${formatCurrency(net)}`
                : net < 0
                  ? `To pay ${formatCurrency(Math.abs(net))}`
                  : 'Settled'
            const tone =
              net > 0 ? 'text-pine-700' : net < 0 ? 'text-danger' : 'text-stone-muted'
            return (
              <li
                key={balance.member_id}
                className="flex items-center justify-between rounded-2xl border border-stone-line/80 bg-panel/90 px-4 py-3"
              >
                <p className="font-semibold text-pine-950">{balance.member_name}</p>
                <p className={`text-sm font-semibold ${tone}`}>{label}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-pine-950">Who should pay whom</h3>
        {summary.settlements.length === 0 ? (
          <EmptyState title="Nothing to settle" description="Everyone is even." />
        ) : (
          <ul className="space-y-2">
            {summary.settlements.map((item, index) => (
              <li
                key={`${item.from_member_id}-${item.to_member_id}-${index}`}
                className="rounded-2xl border border-pine-100 bg-pine-50/70 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-pine-900">{item.from_member_name}</span>
                <span className="text-stone-muted"> pays </span>
                <span className="font-semibold text-pine-900">{item.to_member_name}</span>
                <span className="ml-2 font-display font-bold text-pine-800">
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight ? 'border-pine-100 bg-pine-50' : 'border-stone-line/80 bg-panel/90'
      }`}
    >
      <p className="text-xs font-medium text-stone-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-pine-950">{value}</p>
    </div>
  )
}

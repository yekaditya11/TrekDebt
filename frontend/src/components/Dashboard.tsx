import type { BalanceSummary } from '../types'
import { formatCurrency } from '../utils'
import { EmptyState } from './States'

export function Dashboard({ summary }: { summary: BalanceSummary }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Group wallet cry" value={formatCurrency(summary.total_expense)} />
        <Stat label="Chaos agents" value={String(summary.member_count)} />
        <Stat label="Fair share tax" value={formatCurrency(summary.per_person_share)} highlight />
        <Stat label="UPI missions" value={String(summary.settlements.length)} />
      </div>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-pine-950">
          Scoreboard of shame
        </h3>
        <ul className="space-y-2">
          {summary.balances.map((balance) => {
            const net = Number(balance.net_balance)
            const status =
              net > 0 ? 'Collecting' : net < 0 ? 'In debt' : 'Zen mode'
            const tone =
              net > 0 ? 'text-pine-700' : net < 0 ? 'text-danger' : 'text-stone-muted'
            return (
              <li
                key={balance.member_id}
                className="rounded-2xl border border-stone-line/80 bg-panel/90 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-pine-950">{balance.member_name}</p>
                  <p className={`text-sm font-semibold ${tone}`}>
                    {status} {net === 0 ? '' : formatCurrency(Math.abs(net))}
                  </p>
                </div>
                <p className="mt-1 text-xs text-stone-muted">
                  Flexed {formatCurrency(balance.total_paid)} · Owes the universe{' '}
                  {formatCurrency(balance.share)}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold text-pine-950">
          Pay up, cowards
        </h3>
        {summary.settlements.length === 0 ? (
          <EmptyState
            title="Financial peace achieved"
            description="Nobody owes anybody. Touch grass. Celebrate with chai."
          />
        ) : (
          <ul className="space-y-2">
            {summary.settlements.map((item, index) => (
              <li
                key={`${item.from_member_id}-${item.to_member_id}-${index}`}
                className="rounded-2xl border border-pine-100 bg-pine-50/70 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-pine-900">{item.from_member_name}</span>
                <span className="text-stone-muted"> owes </span>
                <span className="font-semibold text-pine-900">{item.to_member_name}</span>
                <span className="text-stone-muted"> a sacred </span>
                <span className="font-display font-bold text-pine-800">
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
        highlight
          ? 'border-pine-100 bg-pine-50'
          : 'border-stone-line/80 bg-panel/90'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-pine-950">{value}</p>
    </div>
  )
}

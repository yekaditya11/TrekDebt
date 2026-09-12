import { useMemo } from 'react'
import type { Expense } from '../types'
import { formatCurrency } from '../utils'

interface CategoryBreakdownProps {
  expenses: Expense[]
  currency: string
}

export function CategoryBreakdown({ expenses, currency }: CategoryBreakdownProps) {
  const rows = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of expenses) {
      const key = expense.category || 'Misc'
      totals.set(key, (totals.get(key) ?? 0) + Number(expense.amount))
    }
    return [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [expenses])

  if (rows.length === 0) return null

  const max = Math.max(...rows.map((r) => r.total), 1)

  return (
    <section className="mb-5 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
      <h2 className="text-sm font-semibold text-pine-950">By category</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li key={row.category}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-pine-900">{row.category}</span>
              <span className="text-stone-muted">
                {formatCurrency(row.total, currency)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-pine-50">
              <div
                className="h-full rounded-full bg-pine-600"
                style={{ width: `${Math.max(6, (row.total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

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
    <section className="mb-6">
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-pine-900">{row.category}</span>
              <span className="font-display text-sm font-semibold tabular-nums text-pine-800">
                {formatCurrency(row.total, currency)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-pine-50">
              <div
                className="h-full rounded-full bg-pine-600"
                style={{ width: `${Math.max(8, (row.total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

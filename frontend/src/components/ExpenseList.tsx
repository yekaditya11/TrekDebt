import type { Expense } from '../types'
import { formatCurrency } from '../utils'

interface ExpenseListProps {
  expenses: Expense[]
  memberCount: number
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseList({
  expenses,
  memberCount,
  currency,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  return (
    <ul className="space-y-2">
      {expenses.map((expense) => {
        const sharedByEveryone =
          expense.split_member_ids.length === 0 ||
          expense.split_member_ids.length >= memberCount
        const meta = sharedByEveryone
          ? expense.paid_by_name
          : `${expense.paid_by_name} · ${expense.split_member_names.join(', ')}`

        return (
          <li
            key={expense.id}
            className="flex items-center gap-2 rounded-3xl border border-stone-line/70 bg-panel px-3 py-3"
          >
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="flex min-w-0 flex-1 items-center gap-3 px-1 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-pine-950">
                  {expense.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-stone-muted">
                  {expense.category}
                  <span className="mx-1.5 text-stone-line">·</span>
                  {meta}
                </p>
              </div>
              <p className="shrink-0 font-display text-lg font-bold tabular-nums text-pine-700">
                {formatCurrency(expense.amount, currency)}
              </p>
            </button>
            <button
              type="button"
              aria-label={`Delete ${expense.name}`}
              className="shrink-0 rounded-xl px-2.5 py-2 text-sm text-danger/80 hover:bg-danger-soft"
              onClick={() => onDelete(expense)}
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}

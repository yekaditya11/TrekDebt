import type { Expense } from '../types'
import { formatCurrency } from '../utils'
import { Button } from './Button'

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
        const splitLabel = sharedByEveryone
          ? 'everyone'
          : expense.split_member_names.join(', ')

        return (
          <li
            key={expense.id}
            className="rounded-2xl border border-stone-line/80 bg-panel/90 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-pine-950">{expense.name}</p>
                  <span className="shrink-0 rounded-md bg-pine-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pine-800">
                    {expense.category}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-muted">
                  Paid by {expense.paid_by_name} · Shared by {splitLabel}
                </p>
                {expense.notes ? (
                  <p className="mt-1 truncate text-xs text-stone-muted/90">{expense.notes}</p>
                ) : null}
              </div>
              <p className="shrink-0 font-display text-lg font-bold text-pine-800">
                {formatCurrency(expense.amount, currency)}
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => onEdit(expense)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => onDelete(expense)}
              >
                Delete
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

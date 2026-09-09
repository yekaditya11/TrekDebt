import type { Expense } from '../types'
import { formatCurrency } from '../utils'
import { Button } from './Button'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  return (
    <ul className="space-y-2">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="rounded-2xl border border-stone-line/80 bg-panel/90 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-pine-950">{expense.name}</p>
              <p className="mt-0.5 text-xs text-stone-muted">
                Paid by {expense.paid_by_name}
              </p>
            </div>
            <p className="shrink-0 font-display text-lg font-bold text-pine-800">
              {formatCurrency(expense.amount)}
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
      ))}
    </ul>
  )
}

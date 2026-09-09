import type { Expense } from '../types'
import { formatCurrency, formatDate } from '../utils'
import { Button } from './Button'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  return (
    <ul className="space-y-3">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="rounded-2xl border border-stone-line/80 bg-panel/90 px-4 py-3.5 shadow-sm shadow-stone-900/5 transition hover:border-pine-300/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-pine-950">{expense.name}</p>
              <p className="mt-0.5 text-xs text-stone-muted">
                {formatDate(expense.expense_date)} · {expense.category} · Hit taken by{' '}
                <span className="font-medium text-pine-800">{expense.paid_by_name}</span>
              </p>
              {expense.notes ? (
                <p className="mt-1 text-sm text-stone-muted line-clamp-2">{expense.notes}</p>
              ) : null}
            </div>
            <p className="shrink-0 font-display text-lg font-bold text-pine-800">
              {formatCurrency(expense.amount)}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => onEdit(expense)}>
              Edit
            </Button>
            <Button type="button" variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => onDelete(expense)}>
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

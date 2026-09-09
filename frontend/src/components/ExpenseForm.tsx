import { useState } from 'react'
import type { Expense, ExpenseCategory, Member } from '../types'
import { CATEGORIES } from '../types'
import { Button } from './Button'
import { SelectInput, TextArea, TextInput } from './FormFields'
import { todayISO } from '../utils'

export interface ExpenseFormValues {
  name: string
  amount: string
  paid_by_id: string
  category: ExpenseCategory
  expense_date: string
  notes: string
}

interface ExpenseFormProps {
  members: Member[]
  initial?: Expense | null
  defaultPaidById?: string
  submitting?: boolean
  onSubmit: (values: ExpenseFormValues) => Promise<void> | void
  onCancel?: () => void
}

function toValues(expense?: Expense | null, defaultPaidById?: string): ExpenseFormValues {
  return {
    name: expense?.name ?? '',
    amount: expense ? String(expense.amount) : '',
    paid_by_id: expense?.paid_by_id ?? defaultPaidById ?? '',
    category: (expense?.category as ExpenseCategory) ?? 'Misc',
    expense_date: expense?.expense_date ?? todayISO(),
    notes: expense?.notes ?? '',
  }
}

export function ExpenseForm({
  members,
  initial,
  defaultPaidById,
  submitting,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    toValues(initial, defaultPaidById),
  )
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError('Enter an expense name')
      return
    }
    const amount = Number(values.amount)
    if (!amount || amount <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }
    if (!values.paid_by_id) {
      setError('Select who paid')
      return
    }
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput
        id="expense-name"
        label="What did we buy this time?"
        placeholder="Emergency Maggi at 3am"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          id="expense-amount"
          label="How much did it hurt? (₹)"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="420"
          value={values.amount}
          onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
          required
        />
        <TextInput
          id="expense-date"
          label="Day of the crime"
          type="date"
          value={values.expense_date}
          onChange={(e) => setValues((v) => ({ ...v, expense_date: e.target.value }))}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectInput
          id="expense-paid-by"
          label="Who took the hit?"
          value={values.paid_by_id}
          onChange={(e) => setValues((v) => ({ ...v, paid_by_id: e.target.value }))}
          required
        >
          <option value="">Pick a hero / victim</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          id="expense-category"
          label="Category of chaos"
          value={values.category}
          onChange={(e) =>
            setValues((v) => ({ ...v, category: e.target.value as ExpenseCategory }))
          }
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectInput>
      </div>
      <TextArea
        id="expense-notes"
        label="Tea / notes (optional)"
        placeholder="Was totally necessary. Trust."
        value={values.notes}
        onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Never mind
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="sm:min-w-36">
          {submitting ? 'Uploading the drama…' : initial ? 'Save the rewrite' : 'Lock it in'}
        </Button>
      </div>
    </form>
  )
}

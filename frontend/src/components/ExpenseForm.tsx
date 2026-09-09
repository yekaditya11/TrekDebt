import { useState } from 'react'
import type { Expense, Member } from '../types'
import { Button } from './Button'
import { TextInput } from './FormFields'
import { todayISO } from '../utils'

export interface ExpenseFormValues {
  name: string
  amount: string
  paid_by_ids: string[]
  expense_date: string
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
    paid_by_ids: expense?.paid_by_id
      ? [expense.paid_by_id]
      : defaultPaidById
        ? [defaultPaidById]
        : [],
    expense_date: expense?.expense_date ?? todayISO(),
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
  const editing = Boolean(initial)

  function togglePayer(memberId: string) {
    setValues((v) => {
      if (editing) return { ...v, paid_by_ids: [memberId] }
      const exists = v.paid_by_ids.includes(memberId)
      return {
        ...v,
        paid_by_ids: exists
          ? v.paid_by_ids.filter((id) => id !== memberId)
          : [...v.paid_by_ids, memberId],
      }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError('Enter a description')
      return
    }
    const amount = Number(values.amount)
    if (!amount || amount <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (values.paid_by_ids.length === 0) {
      setError('Select who paid')
      return
    }
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput
        id="expense-amount"
        label="Amount (₹)"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        placeholder="0"
        value={values.amount}
        onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
        required
        autoFocus={!editing}
      />
        <TextInput
          id="expense-name"
          label="Description"
          placeholder="Dinner, taxi, hotel"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
        />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-ink">Who paid?</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const selected = values.paid_by_ids.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => togglePayer(member.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  selected
                    ? 'border-pine-600 bg-pine-700 text-white dark:text-pine-950'
                    : 'border-stone-line bg-panel text-pine-900 hover:bg-pine-50'
                }`}
              >
                {member.name}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-stone-muted">
          Cost is split equally among all trip members.
        </p>
      </fieldset>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="sm:min-w-36">
          {submitting ? 'Saving…' : initial ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  )
}

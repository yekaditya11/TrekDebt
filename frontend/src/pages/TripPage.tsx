import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { CopyLinkButton } from '../components/CopyLinkButton'
import { ExpenseForm, type ExpenseFormValues } from '../components/ExpenseForm'
import { ExpenseList } from '../components/ExpenseList'
import { DropdownSelect, TextInput } from '../components/FormFields'
import { ConfirmDialog, Modal } from '../components/Modal'
import { SettlementsCard } from '../components/SettlementsCard'
import { EmptyState, ErrorBanner, Spinner, SuccessToast } from '../components/States'
import { TripSummaryCard } from '../components/TripSummaryCard'
import {
  CATEGORIES,
  CURRENCIES,
  type BalanceSummary,
  type Expense,
  type ExpenseCategory,
  type Member,
  type Trip,
  type TripCurrency,
} from '../types'
import {
  clearStoredMemberId,
  forgetRecentTrip,
  getStoredMemberId,
  rememberTrip,
  storeMemberId,
  todayISO,
} from '../utils'

const REFRESH_MS = 10_000

export function TripPage() {
  const { publicId = '' } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<BalanceSummary | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'All'>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deletingTrip, setDeletingTrip] = useState(false)
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [tripNameDraft, setTripNameDraft] = useState('')
  const [currencyDraft, setCurrencyDraft] = useState<TripCurrency>('INR')
  const [newMemberName, setNewMemberName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const shareUrl = useMemo(() => {
    if (!trip) return ''
    return `${window.location.origin}/trip/${trip.public_id}`
  }, [trip])

  const currency = trip?.currency || 'INR'

  const currentMember: Member | undefined = useMemo(
    () => trip?.members.find((m) => m.id === currentMemberId),
    [trip, currentMemberId],
  )

  const loadAll = useCallback(
    async (opts?: { quiet?: boolean; category?: ExpenseCategory | 'All' }) => {
      if (!publicId) return
      const filter = opts?.category ?? categoryFilter
      if (!opts?.quiet) {
        setLoading(true)
        setError(null)
      }
      try {
        const [tripData, expenseData, allExpenseData, balanceData] = await Promise.all([
          api.getTrip(publicId),
          api.listExpenses(
            publicId,
            filter === 'All' ? undefined : { category: filter },
          ),
          api.listExpenses(publicId),
          api.getBalances(publicId),
        ])
        setTrip(tripData)
        setExpenses(expenseData)
        setAllExpenses(allExpenseData)
        setSummary(balanceData)
        rememberTrip(tripData.public_id, tripData.name)

        const stored = getStoredMemberId(publicId)
        if (stored && tripData.members.some((m) => m.id === stored)) {
          setCurrentMemberId(stored)
        }
      } catch (err) {
        if (!opts?.quiet) {
          setError(err instanceof ApiError ? err.message : 'Failed to load trip')
        }
      } finally {
        if (!opts?.quiet) setLoading(false)
      }
    },
    [publicId, categoryFilter],
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!publicId || !currentMemberId) return
    const id = window.setInterval(() => {
      void loadAll({ quiet: true })
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [publicId, currentMemberId, loadAll])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function refreshLists() {
    if (!publicId) return
    const [expenseData, allExpenseData, tripData, balanceData] = await Promise.all([
      api.listExpenses(
        publicId,
        categoryFilter === 'All' ? undefined : { category: categoryFilter },
      ),
      api.listExpenses(publicId),
      api.getTrip(publicId),
      api.getBalances(publicId),
    ])
    setExpenses(expenseData)
    setAllExpenses(allExpenseData)
    setTrip(tripData)
    setSummary(balanceData)
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault()
    if (!publicId || !joinName.trim()) return
    setJoining(true)
    setError(null)
    try {
      const member = await api.joinTrip(publicId, joinName.trim())
      storeMemberId(publicId, member.id)
      setCurrentMemberId(member.id)
      await loadAll()
      setToast(`Joined as ${member.name}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join')
    } finally {
      setJoining(false)
    }
  }

  function selectExistingMember(memberId: string) {
    if (!publicId) return
    storeMemberId(publicId, memberId)
    setCurrentMemberId(memberId)
  }

  async function handleSaveExpense(values: ExpenseFormValues) {
    if (!publicId) return
    setSaving(true)
    setError(null)
    try {
      const notes = values.notes.trim() || null
      const payload = {
        name: values.name.trim(),
        amount: Number(values.amount),
        paid_by_ids: values.paid_by_ids,
        paid_by_id: values.paid_by_ids[0],
        split_member_ids: values.split_member_ids,
        category: values.category,
        expense_date: values.expense_date || todayISO(),
        notes,
      }
      if (editing) {
        await api.updateExpense(publicId, editing.id, {
          name: payload.name,
          amount: payload.amount,
          paid_by_id: payload.paid_by_id,
          split_member_ids: payload.split_member_ids,
          category: payload.category,
          expense_date: payload.expense_date,
          notes,
        })
        setToast('Updated')
      } else {
        await api.addExpense(publicId, payload)
        setToast('Added')
      }
      setShowAdd(false)
      setEditing(null)
      await refreshLists()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!publicId || !deleting) return
    setSaving(true)
    try {
      await api.deleteExpense(publicId, deleting.id)
      setDeleting(null)
      setToast('Deleted')
      await refreshLists()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTrip() {
    if (!publicId || !trip) return
    setSaving(true)
    try {
      await api.deleteTrip(publicId)
      forgetRecentTrip(publicId)
      clearStoredMemberId(publicId)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete trip')
      setDeletingTrip(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTripEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!publicId || !trip) return
    setSaving(true)
    setError(null)
    try {
      const name = tripNameDraft.trim()
      const patch: { name?: string; currency?: string } = {}
      if (name && name !== trip.name) patch.name = name
      if (currencyDraft !== trip.currency) patch.currency = currencyDraft
      if (Object.keys(patch).length > 0) {
        const updated = await api.updateTrip(publicId, patch)
        setTrip(updated)
        rememberTrip(updated.public_id, updated.name)
      }
      const member = newMemberName.trim()
      if (member) {
        await api.addMember(publicId, member)
        setNewMemberName('')
      }
      await refreshLists()
      setShowEditTrip(false)
      setToast('Trip updated')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update trip')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (error && !trip) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <ErrorBanner message={error} onRetry={() => void loadAll()} />
      </div>
    )
  }

  if (!trip) return null

  if (!currentMember) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-10 pt-8 sm:px-6">
        <AppHeader title={trip.name} subtitle="Select your name to continue." backTo="/" />
        {error ? (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        ) : null}

        <section className="rounded-3xl border border-stone-line/70 bg-panel/80 p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-pine-950">Who are you?</h2>
          <ul className="mt-3 space-y-2">
            {trip.members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => selectExistingMember(member.id)}
                  className="w-full rounded-xl border border-stone-line bg-panel px-4 py-3 text-left text-sm font-semibold text-pine-900 transition hover:border-pine-300 hover:bg-pine-50"
                >
                  {member.name}
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleJoin} className="mt-5 space-y-3 border-t border-stone-line pt-5">
            <TextInput
              id="join-name"
              label="Or add yourself"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
            />
            <Button type="submit" fullWidth disabled={joining || !joinName.trim()}>
              {joining ? 'Joining…' : 'Join'}
            </Button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-28 pt-8 sm:px-6">
      <AppHeader title={trip.name} subtitle={currentMember.name} backTo="/" />

      <div className="mb-5 space-y-2 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
        <p className="truncate text-xs text-stone-muted">{shareUrl}</p>
        <CopyLinkButton url={shareUrl} />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="!py-2.5"
            onClick={() => {
              setTripNameDraft(trip.name)
              setCurrencyDraft((trip.currency as TripCurrency) || 'INR')
              setNewMemberName('')
              setShowEditTrip(true)
            }}
          >
            Edit trip
          </Button>
          <Button
            type="button"
            variant="danger"
            fullWidth
            className="!py-2.5"
            onClick={() => setDeletingTrip(true)}
          >
            Delete trip
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="!py-2 text-xs"
          onClick={() => void loadAll({ quiet: true }).then(() => setToast('Refreshed'))}
        >
          Refresh
        </Button>
      </div>

      <TripSummaryCard summary={summary} currency={currency} />
      <SettlementsCard settlements={summary?.settlements ?? []} currency={currency} />
      <CategoryBreakdown expenses={allExpenses} currency={currency} />

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => void loadAll()} />
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {(['All', ...CATEGORIES] as const).map((cat) => {
          const selected = categoryFilter === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selected
                  ? 'border-pine-600 bg-pine-700 text-white dark:text-pine-950'
                  : 'border-stone-line bg-panel text-pine-900 hover:bg-pine-50'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      <section>
        {expenses.length === 0 ? (
          <EmptyState
            title={categoryFilter === 'All' ? 'No expenses yet' : `No ${categoryFilter} expenses`}
            description={
              categoryFilter === 'All'
                ? 'Tap Add expense below to start.'
                : 'Try another category or add a new expense.'
            }
          />
        ) : (
          <ExpenseList
            expenses={expenses}
            memberCount={trip.members.length}
            currency={currency}
            onEdit={(expense) => setEditing(expense)}
            onDelete={(expense) => setDeleting(expense)}
          />
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-line/80 bg-mist/95 px-4 py-3 backdrop-blur dark:bg-mist/90">
        <div className="mx-auto max-w-xl">
          <Button
            type="button"
            fullWidth
            className="!py-4 text-base shadow-md shadow-pine-900/25"
            onClick={() => setShowAdd(true)}
          >
            + Add expense
          </Button>
        </div>
      </div>

      {showAdd || editing ? (
        <Modal
          title={editing ? 'Edit expense' : 'Add expense'}
          onClose={() => {
            setShowAdd(false)
            setEditing(null)
          }}
        >
          <ExpenseForm
            members={trip.members}
            initial={editing}
            defaultPaidById={currentMember.id}
            submitting={saving}
            onSubmit={handleSaveExpense}
            onCancel={() => {
              setShowAdd(false)
              setEditing(null)
            }}
          />
        </Modal>
      ) : null}

      {showEditTrip ? (
        <Modal title="Edit trip" onClose={() => setShowEditTrip(false)}>
          <form onSubmit={handleSaveTripEdit} className="space-y-4">
            <TextInput
              id="trip-name-edit"
              label="Trip name"
              value={tripNameDraft}
              onChange={(e) => setTripNameDraft(e.target.value)}
              required
            />
            <DropdownSelect
              id="trip-currency-edit"
              label="Currency"
              value={currencyDraft}
              options={CURRENCIES.map((code) => ({ value: code, label: code }))}
              onChange={(next) => setCurrencyDraft(next as TripCurrency)}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-stone-ink">Members</p>
              <ul className="mb-3 space-y-1 text-sm text-stone-muted">
                {trip.members.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
              <TextInput
                id="add-member"
                label="Add member"
                placeholder="Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowEditTrip(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete expense?"
          message={`Remove “${deleting.name}”?`}
          confirmLabel="Delete"
          loading={saving}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      {deletingTrip ? (
        <ConfirmDialog
          title="Delete trip?"
          message={`Delete “${trip.name}” and all its expenses? This cannot be undone.`}
          confirmLabel="Delete trip"
          loading={saving}
          onConfirm={() => void handleDeleteTrip()}
          onCancel={() => setDeletingTrip(false)}
        />
      ) : null}

      {toast ? <SuccessToast message={toast} /> : null}
    </div>
  )
}

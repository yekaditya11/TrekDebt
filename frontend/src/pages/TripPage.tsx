import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { CopyLinkButton } from '../components/CopyLinkButton'
import { Dashboard } from '../components/Dashboard'
import { ExpenseForm, type ExpenseFormValues } from '../components/ExpenseForm'
import { ExpenseList } from '../components/ExpenseList'
import { TextInput } from '../components/FormFields'
import { ConfirmDialog, Modal } from '../components/Modal'
import { EmptyState, ErrorBanner, Spinner, SuccessToast } from '../components/States'
import type { BalanceSummary, Expense, Member, Trip } from '../types'
import { getStoredMemberId, rememberTrip, storeMemberId, todayISO, forgetRecentTrip, clearStoredMemberId } from '../utils'

type Tab = 'expenses' | 'split'

export function TripPage() {
  const { publicId = '' } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balances, setBalances] = useState<BalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deletingTrip, setDeletingTrip] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const shareUrl = useMemo(() => {
    if (!trip) return ''
    return `${window.location.origin}/trip/${trip.public_id}`
  }, [trip])

  const currentMember: Member | undefined = useMemo(
    () => trip?.members.find((m) => m.id === currentMemberId),
    [trip, currentMemberId],
  )

  const loadAll = useCallback(async () => {
    if (!publicId) return
    setLoading(true)
    setError(null)
    try {
      const [tripData, expenseData, balanceData] = await Promise.all([
        api.getTrip(publicId),
        api.listExpenses(publicId),
        api.getBalances(publicId),
      ])
      setTrip(tripData)
      setExpenses(expenseData)
      setBalances(balanceData)
      rememberTrip(tripData.public_id, tripData.name)

      const stored = getStoredMemberId(publicId)
      if (stored && tripData.members.some((m) => m.id === stored)) {
        setCurrentMemberId(stored)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load trip')
    } finally {
      setLoading(false)
    }
  }, [publicId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function refreshLists() {
    if (!publicId) return
    const [expenseData, balanceData, tripData] = await Promise.all([
      api.listExpenses(publicId),
      api.getBalances(publicId),
      api.getTrip(publicId),
    ])
    setExpenses(expenseData)
    setBalances(balanceData)
    setTrip(tripData)
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
      const payload = {
        name: values.name.trim(),
        amount: Number(values.amount),
        paid_by_ids: values.paid_by_ids,
        paid_by_id: values.paid_by_ids[0],
        category: 'Misc' as const,
        expense_date: values.expense_date || todayISO(),
        notes: null,
      }
      if (editing) {
        await api.updateExpense(publicId, editing.id, {
          name: payload.name,
          amount: payload.amount,
          paid_by_id: payload.paid_by_id,
          category: payload.category,
          expense_date: payload.expense_date,
          notes: null,
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

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => void loadAll()} />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-panel/60 p-1">
        <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>
          Expenses
        </TabButton>
        <TabButton active={tab === 'split'} onClick={() => setTab('split')}>
          Balances
        </TabButton>
      </div>

      {tab === 'expenses' ? (
        <section>
          {expenses.length === 0 ? (
            <EmptyState title="No expenses yet" description="Tap Add expense below to start." />
          ) : (
            <ExpenseList
              expenses={expenses}
              onEdit={(expense) => setEditing(expense)}
              onDelete={(expense) => setDeleting(expense)}
            />
          )}
        </section>
      ) : balances ? (
        <Dashboard summary={balances} />
      ) : (
        <Spinner label="Loading…" />
      )}

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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-pine-700 text-white shadow-sm dark:text-pine-950'
          : 'text-stone-muted hover:text-pine-800'
      }`}
    >
      {children}
    </button>
  )
}

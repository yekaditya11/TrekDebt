import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { CopyLinkButton } from '../components/CopyLinkButton'
import { Dashboard } from '../components/Dashboard'
import { ExpenseForm, type ExpenseFormValues } from '../components/ExpenseForm'
import { ExpenseList } from '../components/ExpenseList'
import { SelectInput, TextInput } from '../components/FormFields'
import { ConfirmDialog, Modal } from '../components/Modal'
import { EmptyState, ErrorBanner, Spinner, SuccessToast } from '../components/States'
import type { BalanceSummary, Expense, ExpenseCategory, Member, Trip } from '../types'
import { CATEGORIES } from '../types'
import { getStoredMemberId, storeMemberId } from '../utils'

type Tab = 'expenses' | 'dashboard'

export function TripPage() {
  const { publicId = '' } = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balances, setBalances] = useState<BalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
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
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function refreshLists() {
    if (!publicId) return
    const [expenseData, balanceData, tripData] = await Promise.all([
      api.listExpenses(publicId, {
        category: categoryFilter || undefined,
        member_id: memberFilter || undefined,
      }),
      api.getBalances(publicId),
      api.getTrip(publicId),
    ])
    setExpenses(expenseData)
    setBalances(balanceData)
    setTrip(tripData)
  }

  useEffect(() => {
    if (!publicId || !trip) return
    void (async () => {
      try {
        const expenseData = await api.listExpenses(publicId, {
          category: categoryFilter || undefined,
          member_id: memberFilter || undefined,
        })
        setExpenses(expenseData)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to filter expenses')
      }
    })()
  }, [categoryFilter, memberFilter, publicId, trip?.public_id])

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
      setToast(`Boom. ${member.name} has entered the chat.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join trip')
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
        paid_by_id: values.paid_by_id,
        category: values.category as ExpenseCategory,
        expense_date: values.expense_date,
        notes: values.notes.trim() || null,
      }
      if (editing) {
        await api.updateExpense(publicId, editing.id, payload)
        setToast('Expense updated. History rewritten.')
      } else {
        await api.addExpense(publicId, payload)
        setToast('Logged. The group chat will never recover.')
      }
      setShowAdd(false)
      setEditing(null)
      await refreshLists()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save expense')
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
      setToast('Poof. Expense yeeted into the void.')
      await refreshLists()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete expense')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10">
        <Spinner label="Summoning the trip…" />
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
        <AppHeader
          title={trip.name}
          subtitle="Pick your government name before the receipts start flying."
          backTo="/"
        />
        {error ? <div className="mb-4"><ErrorBanner message={error} /></div> : null}

        <section className="rounded-3xl border border-stone-line/70 bg-panel/80 p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-pine-950">
            State your identity, traveler
          </h2>
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
              label="New here? Crash the party"
              placeholder="Alias / real name / whatever"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
            />
            <Button type="submit" fullWidth disabled={joining || !joinName.trim()}>
              {joining ? 'Sneaking in…' : 'I’m in. Let’s go broke together'}
            </Button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-28 pt-8 sm:px-6">
      <AppHeader
        title={trip.name}
        subtitle={`Currently causing financial drama as ${currentMember.name}`}
        backTo="/"
      />

      <div className="mb-5 space-y-2 rounded-2xl border border-stone-line/70 bg-panel/80 p-4">
        <p className="truncate text-xs text-stone-muted">{shareUrl}</p>
        <CopyLinkButton url={shareUrl} />
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => void loadAll()} />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-panel/60 p-1">
        <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>
          The damage
        </TabButton>
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Who owes?
        </TabButton>
      </div>

      {tab === 'expenses' ? (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectInput
              id="filter-category"
              label="Vibe check (category)"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All the chaos</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              id="filter-member"
              label="Blame filter"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            >
              <option value="">Whole circus</option>
              {trip.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              title="Nobody spent anything? Suspicious."
              description="Hit the big green button and confess your first purchase."
            />
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
        <Spinner label="Doing spicy maths…" />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-line/80 bg-mist/95 px-4 py-3 backdrop-blur dark:bg-mist/90">
        <div className="mx-auto max-w-xl">
          <Button
            type="button"
            fullWidth
            className="!py-4 text-base shadow-md shadow-pine-900/25"
            onClick={() => setShowAdd(true)}
          >
            + Drop a receipt
          </Button>
        </div>
      </div>

      {showAdd || editing ? (
        <Modal
          title={editing ? 'Rewrite history' : 'Confess a purchase'}
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
          title="Yeet this expense?"
          message={`“${deleting.name}” will vanish forever. No take-backsies.`}
          confirmLabel="Yeet it"
          loading={saving}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleting(null)}
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

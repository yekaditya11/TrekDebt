import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { TextInput } from '../components/FormFields'
import { ErrorBanner } from '../components/States'

export function HomePage() {
  const navigate = useNavigate()
  const [tripName, setTripName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => tripName.trim().length > 0 && members.length > 0 && !submitting,
    [tripName, members, submitting],
  )

  function addMember() {
    const name = memberInput.trim()
    if (!name) return
      if (members.some((m) => m.toLowerCase() === name.toLowerCase())) {
      setError('That name already joined the circus')
      return
    }
    setMembers((prev) => [...prev, name])
    setMemberInput('')
    setError(null)
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const trip = await api.createTrip({
        name: tripName.trim(),
        members,
      })
      navigate(`/trip/${trip.public_id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create trip')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-10 pt-8 sm:px-6">
      <AppHeader
        title="Who paid for the Maggi?"
        subtitle="One link. One chaotic friend group. Zero awkward 'UPI me later' debates at 2am."
      />

      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-stone-line/70 bg-panel/80 p-5 shadow-sm shadow-stone-900/5 backdrop-blur-sm sm:p-6"
      >
        <TextInput
          id="trip-name"
          label="Name this adventure"
          placeholder="Operation: Broke in Manali"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          required
        />

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-stone-ink" htmlFor="member-name">
            Recruit the squad
          </label>
          <div className="flex gap-2">
            <input
              id="member-name"
              className="w-full rounded-xl border border-stone-line bg-panel px-3.5 py-2.5 text-sm outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-100"
              placeholder="That one friend who 'forgot wallet'"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMember()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addMember}>
              Yeet in
            </Button>
          </div>
          {members.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {members.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center gap-2 rounded-full bg-pine-50 px-3 py-1 text-sm text-pine-900"
                >
                  {name}
                  <button
                    type="button"
                    className="text-stone-muted hover:text-danger"
                    aria-label={`Remove ${name}`}
                    onClick={() => setMembers((prev) => prev.filter((m) => m !== name))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-muted">
              Solo trips are cute. Add at least one co-conspirator.
            </p>
          )}
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        ) : null}

        <Button type="submit" fullWidth className="mt-6 !py-3.5 text-base" disabled={!canSubmit}>
          {submitting ? 'Brewing the chaos link…' : 'Launch trip & steal a share link'}
        </Button>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { Button } from './Button'
import { ConfirmDialog } from './Modal'
import {
  clearStoredMemberId,
  copyText,
  forgetRecentTrip,
  getRecentTrips,
  tripShareUrl,
  type RecentTrip,
} from '../utils'

export function RecentTrips() {
  const [trips, setTrips] = useState<RecentTrip[]>([])
  const [open, setOpen] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RecentTrip | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setTrips(getRecentTrips())
  }

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (!copiedId) return
    const timer = window.setTimeout(() => setCopiedId(null), 1800)
    return () => window.clearTimeout(timer)
  }, [copiedId])

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await api.deleteTrip(deleting.public_id)
      forgetRecentTrip(deleting.public_id)
      clearStoredMemberId(deleting.public_id)
      setDeleting(null)
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete trip')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-stone-line/70 bg-panel/80 p-5 shadow-sm sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-pine-950">
            Your trips {trips.length > 0 ? `(${trips.length})` : ''}
          </h2>
          <p className="mt-1 text-sm text-stone-muted">Trips you opened on this phone.</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-pine-700">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {open ? (
        trips.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-stone-line px-4 py-6 text-center text-sm text-stone-muted">
            No trips yet. Create a trip above to see it here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {trips.map((trip) => {
              const url = tripShareUrl(trip.public_id)
              return (
                <li
                  key={trip.public_id}
                  className="rounded-2xl border border-stone-line/80 bg-mist/40 px-4 py-3"
                >
                  <Link
                    to={`/trip/${trip.public_id}`}
                    className="block truncate font-semibold text-pine-900 hover:underline"
                  >
                    {trip.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-stone-muted">{url}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/trip/${trip.public_id}`}>
                      <Button type="button" className="!px-3 !py-1.5 text-xs">
                        Open
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={async () => {
                        const ok = await copyText(url)
                        if (ok) setCopiedId(trip.public_id)
                      }}
                    >
                      {copiedId === trip.public_id ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => setDeleting(trip)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete trip?"
          message={`Delete “${deleting.name}” and all its expenses? This cannot be undone.`}
          confirmLabel="Delete trip"
          loading={busy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </section>
  )
}

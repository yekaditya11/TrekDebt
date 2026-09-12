export function formatCurrency(
  value: string | number,
  currency: string = 'INR',
): string {
  const amount = typeof value === 'string' ? Number(value) : value
  const code = CURRENCY_CODES.has(currency) ? currency : 'INR'
  if (Number.isNaN(amount)) {
    return new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(0)
  }
  return new Intl.NumberFormat(localeFor(code), {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(amount)
}

const CURRENCY_CODES = new Set(['INR', 'USD', 'EUR'])

function localeFor(currency: string): string {
  if (currency === 'USD') return 'en-US'
  if (currency === 'EUR') return 'en-IE'
  return 'en-IN'
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 10)
}

export function sessionKey(publicId: string): string {
  return `tripexpcal:member:${publicId}`
}

export function clearStoredMemberId(publicId: string): void {
  try {
    localStorage.removeItem(sessionKey(publicId))
  } catch {
    // ignore
  }
}

export function getStoredMemberId(publicId: string): string | null {
  try {
    return localStorage.getItem(sessionKey(publicId))
  } catch {
    return null
  }
}

export function storeMemberId(publicId: string, memberId: string): void {
  try {
    localStorage.setItem(sessionKey(publicId), memberId)
  } catch {
    // ignore storage failures
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

export interface RecentTrip {
  public_id: string
  name: string
  last_opened: string
}

const RECENT_TRIPS_KEY = 'tripexpcal:recent-trips'
const MAX_RECENT_TRIPS = 20

export function getRecentTrips(): RecentTrip[] {
  try {
    const raw = localStorage.getItem(RECENT_TRIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentTrip[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t) => t?.public_id && t?.name)
  } catch {
    return []
  }
}

export function rememberTrip(publicId: string, name: string): void {
  try {
    const next: RecentTrip = {
      public_id: publicId,
      name,
      last_opened: new Date().toISOString(),
    }
    const existing = getRecentTrips().filter((t) => t.public_id !== publicId)
    const updated = [next, ...existing].slice(0, MAX_RECENT_TRIPS)
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
  } catch {
    // ignore storage failures
  }
}

/** Only hides from this browser list — does not delete the real trip. */
export function forgetRecentTrip(publicId: string): void {
  try {
    const updated = getRecentTrips().filter((t) => t.public_id !== publicId)
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function tripShareUrl(publicId: string): string {
  return `${window.location.origin}/trip/${publicId}`
}

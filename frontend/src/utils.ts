export function formatCurrency(value: string | number): string {
  const amount = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
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

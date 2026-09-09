import type {
  BalanceSummary,
  Expense,
  ExpensePayload,
  Member,
  Trip,
  TripCreatePayload,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (response.status === 204) {
    return undefined as T
  }

  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      (typeof (body as { detail: unknown }).detail === 'string'
        ? (body as { detail: string }).detail
        : JSON.stringify((body as { detail: unknown }).detail))
    throw new ApiError(response.status, detail || `Request failed (${response.status})`)
  }

  return body as T
}

export const api = {
  createTrip(payload: TripCreatePayload) {
    return request<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getTrip(publicId: string) {
    return request<Trip>(`/api/trips/${publicId}`)
  },

  deleteTrip(publicId: string) {
    return request<void>(`/api/trips/${publicId}`, {
      method: 'DELETE',
    })
  },

  joinTrip(publicId: string, name: string) {
    return request<Member>(`/api/trips/${publicId}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  addMember(publicId: string, name: string) {
    return request<Member>(`/api/trips/${publicId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  listExpenses(publicId: string, params?: { category?: string; member_id?: string }) {
    const search = new URLSearchParams()
    if (params?.category) search.set('category', params.category)
    if (params?.member_id) search.set('member_id', params.member_id)
    const qs = search.toString()
    return request<Expense[]>(`/api/trips/${publicId}/expenses${qs ? `?${qs}` : ''}`)
  },

  addExpense(publicId: string, payload: ExpensePayload) {
    return request<Expense>(`/api/trips/${publicId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateExpense(publicId: string, expenseId: string, payload: Partial<ExpensePayload>) {
    return request<Expense>(`/api/trips/${publicId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteExpense(publicId: string, expenseId: string) {
    return request<void>(`/api/trips/${publicId}/expenses/${expenseId}`, {
      method: 'DELETE',
    })
  },

  getBalances(publicId: string) {
    return request<BalanceSummary>(`/api/trips/${publicId}/balances`)
  },
}

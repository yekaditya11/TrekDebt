export const CATEGORIES = [
  'Food',
  'Transport',
  'Stay',
  'Activities',
  'Misc',
] as const

export type ExpenseCategory = (typeof CATEGORIES)[number]

export interface Member {
  id: string
  name: string
  created_at: string
}

export interface Trip {
  id: string
  public_id: string
  name: string
  created_at: string
  members: Member[]
  share_url_path: string
}

export interface Expense {
  id: string
  name: string
  amount: string
  paid_by_id: string
  paid_by_name: string
  category: string
  expense_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MemberBalance {
  member_id: string
  member_name: string
  total_paid: string
  share: string
  net_balance: string
}

export interface SettlementTransaction {
  from_member_id: string
  from_member_name: string
  to_member_id: string
  to_member_name: string
  amount: string
}

export interface BalanceSummary {
  trip_public_id: string
  trip_name: string
  member_count: number
  total_expense: string
  per_person_share: string
  balances: MemberBalance[]
  settlements: SettlementTransaction[]
}

export interface TripCreatePayload {
  name: string
  members: string[]
}

export interface ExpensePayload {
  name: string
  amount: number
  paid_by_id?: string
  paid_by_ids?: string[]
  category: ExpenseCategory
  expense_date: string
  notes?: string | null
}

export type UserRole = 'admin' | 'worker'

export interface Profile {
  id: string
  username: string
  role: UserRole
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  bookmaker: string
  account_number: string
  login?: string | null
  email?: string | null
  password?: string | null
  is_active: boolean
  is_test: boolean
  created_at: string
}

export interface Leg {
  id: string
  surebet_id: string
  account: string
  bookmaker: string
  market: string
  odds: number
  stake: number
  status: 'pending' | 'won' | 'lost' | 'refund' | 'half_won' | 'half_lost'
  created_at: string
}

export interface Surebet {
  id: string
  user_id: string
  match_name: string
  sport: string
  bank: number
  status: 'pending' | 'settled'
  comment: string | null
  created_at: string
  settled_at?: string | null
  legs?: Leg[]
  profiles?: {
    username: string
  }
}

export interface SurebetWithLegs extends Surebet {
  legs: Leg[]
}

export interface GroupStats {
  label: string
  turnover: number
  profit: number
  roi: number
  count: number
}

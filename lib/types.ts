export type UserRole = 'admin' | 'worker'

export interface Profile {
  id: string
  username: string
  role: UserRole
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
  status: 'pending' | 'won' | 'lost' | 'refund'
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

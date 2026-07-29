import { Leg, SurebetWithLegs } from './types'

export function calculateLegProfit(leg: Leg): number {
  if (leg.status === 'won') {
    return Number((leg.stake * (leg.odds - 1)).toFixed(2))
  }
  if (leg.status === 'lost') {
    return -Number(leg.stake.toFixed(2))
  }
  // 'refund' or 'pending' => 0
  return 0
}

export function calculateSurebetProfit(surebet: SurebetWithLegs): number {
  if (!surebet.legs || surebet.legs.length === 0) return 0
  return surebet.legs.reduce((sum, leg) => sum + calculateLegProfit(leg), 0)
}

export function calculateStakes(totalBank: number, odds: number[]): number[] {
  const weights = odds.map((o) => 1 / o)
  const sum = weights.reduce((acc, w) => acc + w, 0)
  return weights.map((w) => Number((totalBank * (w / sum)).toFixed(2)))
}

export function calculateExpectedProfit(totalBank: number, odds: number[]): number {
  if (odds.length === 0) return 0
  const stakes = calculateStakes(totalBank, odds)
  const payout = stakes[0] * odds[0]
  return Number((payout - totalBank).toFixed(2))
}

export function calculateExpectedProfitFromStakes(stakes: number[], odds: number[]): number {
  if (stakes.length === 0 || odds.length === 0) return 0
  const total = stakes.reduce((acc, s) => acc + s, 0)
  if (total === 0) return 0
  const payout = stakes[0] * odds[0]
  return Number((payout - total).toFixed(2))
}

export function hasPendingLegs(surebet: SurebetWithLegs): boolean {
  return (surebet.legs || []).some((leg) => leg.status === 'pending')
}

export function calculatePotentialProfit(surebet: SurebetWithLegs): number {
  const legs = surebet.legs || []
  if (legs.length === 0) return 0
  const stakes = legs.map((l) => Number(l.stake))
  const odds = legs.map((l) => Number(l.odds))
  return calculateExpectedProfitFromStakes(stakes, odds)
}

export function calculateROI(profit: number, bank: number): number {
  if (!bank) return 0
  return Number(((profit / bank) * 100).toFixed(2))
}

export type MoneyCurrency = 'EUR' | 'USD'

export function formatMoney(value: number, currency: MoneyCurrency = 'EUR'): string {
  const symbol = currency === 'USD' ? '$' : '€'
  return `${symbol}${value.toFixed(2)}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}.${month}.${year}`
}

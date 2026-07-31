import { Profile, SurebetWithLegs } from './types'
import { calculateLegProfit, calculateSurebetProfit, calculatePotentialProfitRange, calculateROI, hasPendingLegs } from './calc'

export interface BreakdownStat {
  label: string
  count: number
  turnover: number
  profit: number
  roi: number
}

export interface WorkerStat {
  profile: Profile
  totalCount: number
  count7d: number
  count30d: number
  pendingCount: number
  turnover: number
  profit: number
  roi: number
  avgRoi: number
  errorCount: number
  errorSurebetIds: string[]
  bySport: BreakdownStat[]
  byBookmaker: BreakdownStat[]
}

const ERROR_TOLERANCE = 0.05

/**
 * A surebet is flagged as a likely worker error if any of these hold:
 * 1. The entered odds don't mathematically form a real surebet
 *    (sum of implied probabilities >= 1) — most likely a typo in odds.
 * 2. The actual settled profit is worse than the worst-case outcome
 *    that was mathematically possible given the entered odds/stakes
 *    (only checked for 2-leg, fully settled surebets, where the
 *    potential range is exact).
 * 3. A comment was left on the surebet (manual flag by the worker/admin).
 */
export function isFlaggedError(surebet: SurebetWithLegs): boolean {
  const legs = surebet.legs || []
  if (legs.length === 0) return false

  const impliedSum = legs.reduce((sum, l) => sum + 1 / Number(l.odds), 0)
  if (impliedSum >= 1) return true

  if (surebet.comment && surebet.comment.trim() !== '') return true

  if (!hasPendingLegs(surebet) && legs.length === 2) {
    const range = calculatePotentialProfitRange(surebet)
    const actual = calculateSurebetProfit(surebet)
    if (actual < range.min - ERROR_TOLERANCE) return true
  }

  return false
}

function buildBreakdown(surebets: SurebetWithLegs[], groupBySport: boolean): BreakdownStat[] {
  const map = new Map<string, { count: number; turnover: number; profit: number }>()

  if (groupBySport) {
    surebets.forEach((s) => {
      const key = s.sport || 'Без категории'
      const entry = map.get(key) || { count: 0, turnover: 0, profit: 0 }
      entry.count += 1
      entry.turnover += Number(s.bank)
      entry.profit += calculateSurebetProfit(s)
      map.set(key, entry)
    })
  } else {
    surebets.forEach((s) => {
      (s.legs || []).forEach((leg) => {
        const key = leg.bookmaker || 'Без БК'
        const entry = map.get(key) || { count: 0, turnover: 0, profit: 0 }
        entry.count += 1
        entry.turnover += Number(leg.stake)
        entry.profit += calculateLegProfit(leg)
        map.set(key, entry)
      })
    })
  }

  return Array.from(map.entries())
    .map(([label, v]) => ({
      label,
      count: v.count,
      turnover: Number(v.turnover.toFixed(2)),
      profit: Number(v.profit.toFixed(2)),
      roi: calculateROI(v.profit, v.turnover),
    }))
    .sort((a, b) => b.turnover - a.turnover)
}

export function computeWorkerStats(profiles: Profile[], surebets: SurebetWithLegs[]): WorkerStat[] {
  const now = Date.now()
  const day7 = now - 7 * 24 * 60 * 60 * 1000
  const day30 = now - 30 * 24 * 60 * 60 * 1000

  return profiles.map((profile) => {
    const own = surebets.filter((s) => s.user_id === profile.id)

    const turnover = own.reduce((sum, s) => sum + Number(s.bank), 0)
    const profit = own.reduce((sum, s) => sum + calculateSurebetProfit(s), 0)
    const roi = calculateROI(profit, turnover)
    const avgRoi = own.length > 0
      ? own.reduce((sum, s) => sum + calculateROI(calculateSurebetProfit(s), Number(s.bank)), 0) / own.length
      : 0

    const count7d = own.filter((s) => new Date(s.created_at).getTime() >= day7).length
    const count30d = own.filter((s) => new Date(s.created_at).getTime() >= day30).length
    const pendingCount = own.filter((s) => hasPendingLegs(s)).length

    const errorSurebets = own.filter(isFlaggedError)

    return {
      profile,
      totalCount: own.length,
      count7d,
      count30d,
      pendingCount,
      turnover: Number(turnover.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      roi,
      avgRoi: Number(avgRoi.toFixed(2)),
      errorCount: errorSurebets.length,
      errorSurebetIds: errorSurebets.map((s) => s.id),
      bySport: buildBreakdown(own, true),
      byBookmaker: buildBreakdown(own, false),
    }
  })
}

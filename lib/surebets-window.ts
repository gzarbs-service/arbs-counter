import type { SupabaseClient } from '@supabase/supabase-js'
import { SurebetWithLegs } from './types'

export type SurebetWindowPeriod = 'week' | 'twoWeeks' | 'month' | 'all'

const PERIOD_DAYS: Record<Exclude<SurebetWindowPeriod, 'all'>, number> = {
  week: 7,
  twoWeeks: 14,
  month: 30,
}

// Converts a window period into the ISO timestamp to filter `created_at`
// by. Returns null for 'all', meaning "no lower bound".
export function periodSinceIso(period: SurebetWindowPeriod): string | null {
  if (period === 'all') return null
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - PERIOD_DAYS[period])
  return since.toISOString()
}

export const PERIOD_LABELS: Record<SurebetWindowPeriod, string> = {
  week: 'Неделя',
  twoWeeks: '2 недели',
  month: 'Месяц',
  all: 'Всё время',
}

interface FetchWindowedSurebetsOptions {
  isAdmin: boolean
  userId?: string | null
  sinceIso: string | null
}

/**
 * Loads surebets created within the given time window, PLUS any surebet
 * that still has a pending (unresolved) leg regardless of its age - so an
 * old unresolved bet never silently disappears from view just because it's
 * older than the default window. Pass `sinceIso: null` to load everything.
 */
export async function fetchWindowedSurebets(
  supabase: SupabaseClient,
  { isAdmin, userId, sinceIso }: FetchWindowedSurebetsOptions
): Promise<{ data: SurebetWithLegs[]; error: string | null }> {
  let pendingIds: string[] = []
  if (sinceIso) {
    const { data: pendingLegs, error: pendingError } = await supabase
      .from('legs')
      .select('surebet_id')
      .eq('status', 'pending')
    if (pendingError) {
      return { data: [], error: pendingError.message }
    }
    pendingIds = Array.from(
      new Set((pendingLegs || []).map((l: { surebet_id: string }) => l.surebet_id))
    )
  }

  let builder = supabase
    .from('surebets')
    .select('*, legs(*)')
    .order('created_at', { ascending: false })

  if (!isAdmin && userId) {
    builder = builder.eq('user_id', userId)
  }

  if (sinceIso) {
    if (pendingIds.length > 0) {
      builder = builder.or(`created_at.gte.${sinceIso},id.in.(${pendingIds.join(',')})`)
    } else {
      builder = builder.gte('created_at', sinceIso)
    }
  }
  // sinceIso === null => 'all' period, no date restriction needed at all.

  const { data, error } = await builder
  if (error) {
    return { data: [], error: error.message }
  }
  return { data: (data as unknown as SurebetWithLegs[]) || [], error: null }
}

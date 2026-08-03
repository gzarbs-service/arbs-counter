'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { calculateLegProfit, formatDate } from '@/lib/calc'
import { buildCommentWithAutoErrors } from '@/lib/worker-stats'
import AdminPanel from './admin-panel'
import WorkerStatsPanel from './worker-stats-panel'

interface AdminSectionProps {
  initialUsers: Profile[]
  surebets: SurebetWithLegs[]
  accounts?: Account[]
  onUpdate?: () => void
  currentUsername?: string
}

// Backfill is a one-off maintenance tool, restricted to the developer account
// rather than every admin, to avoid accidental mass-writes/re-syncs.
const BACKFILL_ALLOWED_USERNAME = 'misha'

type Tab = 'users' | 'stats'

interface BackfillState {
  running: boolean
  done: number
  total: number
  updated: number
  syncFailed: number
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function AdminSection({ initialUsers, surebets, accounts, onUpdate, currentUsername }: AdminSectionProps) {
  const [tab, setTab] = useState<Tab>('users')
  const [backfill, setBackfill] = useState<BackfillState | null>(null)
  const supabase = createClient()
  const canBackfill = currentUsername === BACKFILL_ALLOWED_USERNAME

  const runBackfill = async () => {
    if (backfill?.running) return
    if (
      !confirm(
        'Пересчитать авто-ошибки для ВСЕХ вилок и записать в комментарий (и в Google Таблицу)? Это может занять несколько минут для большого количества вилок.'
      )
    ) {
      return
    }

    setBackfill({ running: true, done: 0, total: surebets.length, updated: 0, syncFailed: 0 })
    let updated = 0
    let syncFailed = 0

    for (let i = 0; i < surebets.length; i++) {
      const s = surebets[i]
      const newComment = buildCommentWithAutoErrors(s)
      const commentChanged = newComment !== (s.comment || '')

      if (commentChanged) {
        const { error } = await supabase.from('surebets').update({ comment: newComment }).eq('id', s.id)
        if (!error) updated++
      }

      // Always (re-)sync to Sheets, even when the comment didn't change in
      // this run, so re-clicking the button can retry any row whose sheet
      // sync failed on a previous run without needing another DB change.
      const rows = (s.legs || []).map((leg) => ({
        account: leg.account,
        bookmaker: leg.bookmaker,
        eventNumber: '',
        betDate: formatDate(s.created_at),
        sport: s.sport,
        market: leg.market,
        stake: leg.stake,
        odds: leg.odds,
        endDate: s.settled_at ? formatDate(s.settled_at) : '',
        status: leg.status,
        profit: calculateLegProfit(leg),
        comment: newComment,
        betId: s.id,
      }))
      // Apps Script processes one doPost at a time; hammering it with an
      // unthrottled sequential burst can cause individual calls to fail
      // silently. Add a small delay and verify the response so failures
      // are surfaced instead of being swallowed.
      try {
        const res = await fetch('/api/sheets-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', surebetId: s.id, rows }),
        })
        if (!res.ok) syncFailed++
      } catch {
        syncFailed++
      }
      await delay(400)

      setBackfill({ running: true, done: i + 1, total: surebets.length, updated, syncFailed })
    }

    setBackfill({ running: false, done: surebets.length, total: surebets.length, updated, syncFailed })
    onUpdate?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {canBackfill && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={runBackfill}
              disabled={backfill?.running}
              className="px-4 py-2 rounded-lg glass hover:border-yellow-400/40 transition text-sm font-medium text-yellow-300 disabled:opacity-50 self-start"
            >
              {backfill?.running ? `Обновляем... ${backfill.done}/${backfill.total}` : 'Обновить авто-ошибки во всех вилках'}
            </button>
            {backfill && !backfill.running && (
              <p className="text-xs text-gray-400">
                Готово. Обновлено комментариев: {backfill.updated} из {backfill.total}.
                {backfill.syncFailed > 0 && (
                  <span className="text-red-400"> Не дошло до таблицы: {backfill.syncFailed}.</span>
                )}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'glass text-gray-400 hover:border-cyan-400/40'
            }`}
          >
            Пользователи
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'stats'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'glass text-gray-400 hover:border-purple-400/40'
            }`}
          >
            Статистика работников
          </button>
        </div>
      </div>

      {tab === 'users' ? (
        <AdminPanel initialUsers={initialUsers} embedded />
      ) : (
        <WorkerStatsPanel profiles={initialUsers} surebets={surebets} accounts={accounts} onUpdate={onUpdate} />
      )}
    </div>
  )
}

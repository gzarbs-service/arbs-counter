import type { SupabaseClient } from '@supabase/supabase-js'

interface NotifyErrorParams {
  surebetId: string
  workerId: string
  workerUsername: string
  matchName: string
  reasons: string[]
}

/**
 * Records a bell-icon notification for a newly detected surebet error and
 * fires a Telegram alert, but only the first time a given surebet is
 * flagged (unique constraint on surebet_id) so re-saving an already-flagged
 * surebet never spams duplicate notifications.
 */
export async function notifyError(
  supabase: SupabaseClient,
  { surebetId, workerId, workerUsername, matchName, reasons }: NotifyErrorParams
): Promise<void> {
  if (reasons.length === 0) return

  const { data, error } = await supabase
    .from('error_notifications')
    .upsert(
      {
        surebet_id: surebetId,
        worker_id: workerId,
        worker_username: workerUsername,
        match_name: matchName,
        reasons: reasons.join('; '),
      },
      { onConflict: 'surebet_id', ignoreDuplicates: true }
    )
    .select()

  // Either an insert failed, or the surebet was already flagged before
  // (ignoreDuplicates skips the row and returns nothing) — either way there
  // is nothing new to alert about.
  if (error || !data || data.length === 0) return

  fetch('/api/notify-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ Обнаружена ошибка в вилке\nРаботник: ${workerUsername}\nМатч: ${matchName}\nПричина: ${reasons.join('; ')}`,
    }),
  }).catch(() => {
    // Telegram delivery is best-effort; the in-app bell icon is the source of truth.
  })
}

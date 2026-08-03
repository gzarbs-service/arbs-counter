'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/calc'

interface NotificationRow {
  id: string
  surebet_id: string
  worker_username: string
  match_name: string
  reasons: string
  created_at: string
}

const supabase = createClient()
const POLL_INTERVAL_MS = 30000

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('error_notifications')
      .select('id, surebet_id, worker_username, match_name, reasons, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  const markAllRead = async () => {
    if (items.length === 0) return
    setBusy(true)
    const ids = items.map((n) => n.id)
    await supabase.from('error_notifications').update({ is_read: true }).in('id', ids)
    setItems([])
    setBusy(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Уведомления об ошибках"
        className="relative px-3 py-2 rounded-lg glass hover:border-orange-400/40 transition text-base"
      >
        📩
        {items.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {items.length > 99 ? '99+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl glass border border-white/10 shadow-xl z-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Ошибки в вилках</h4>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={busy}
                  className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                >
                  Прочитано
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-500">Нет новых ошибок.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2 space-y-1">
                  <p className="text-white font-medium">{n.match_name}</p>
                  <p className="text-gray-400">
                    Работник: {n.worker_username} · {formatDate(n.created_at)}
                  </p>
                  <p className="text-red-300">{n.reasons}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

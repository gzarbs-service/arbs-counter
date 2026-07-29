'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leg, SurebetWithLegs } from '@/lib/types'
import { calculateSurebetProfit, calculateROI, calculateLegProfit, calculateLegPayout, calculatePotentialProfitRange, hasPendingLegs, formatMoney, formatDate } from '@/lib/calc'
import { useCurrency } from './currency-context'

interface SurebetCardProps {
  surebet: SurebetWithLegs
  isAdmin: boolean
  username?: string
  onUpdate: () => void
}

const supabaseClient = createClient()

const STATUS_OPTIONS: { value: Leg['status']; label: string; color: string }[] = [
  { value: 'pending', label: 'Ожидает', color: 'cyan' },
  { value: 'won', label: 'Выигрыш', color: 'green' },
  { value: 'lost', label: 'Проигрыш', color: 'red' },
  { value: 'refund', label: 'Возврат', color: 'yellow' },
]

const colorClasses: Record<string, { active: string; border: string; bg: string }> = {
  green: { active: 'bg-green-500/20 border-green-500/50 text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5' },
  red: { active: 'bg-red-500/20 border-red-500/50 text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5' },
  yellow: { active: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5' },
  cyan: { active: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
}

export default function SurebetCard({ surebet, isAdmin, username, onUpdate }: SurebetCardProps) {
  const { currency } = useCurrency()
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Leg['status']>>({})

  const hasChanges = useMemo(() => {
    return (surebet.legs || []).some((leg) => draftStatuses[leg.id] && draftStatuses[leg.id] !== leg.status)
  }, [surebet.legs, draftStatuses])

  const previewProfit = useMemo(() => {
    return (surebet.legs || []).reduce((sum, leg) => {
      const status = draftStatuses[leg.id] ?? leg.status
      return sum + calculateLegProfit({ ...leg, status } as Leg)
    }, 0)
  }, [surebet.legs, draftStatuses])

  const displayedProfit = hasChanges ? previewProfit : calculateSurebetProfit(surebet)
  const displayedROI = calculateROI(displayedProfit, Number(surebet.bank))

  const isPending = !hasChanges && hasPendingLegs(surebet)
  const potentialRange = useMemo(() => calculatePotentialProfitRange(surebet), [surebet])
  const potentialROIMin = calculateROI(potentialRange.min, Number(surebet.bank))
  const potentialROIMax = calculateROI(potentialRange.max, Number(surebet.bank))
  const isSingleOutcome = potentialRange.min === potentialRange.max
  const isMultiLeg = (surebet.legs || []).length > 2

  const setStatus = (legId: string, status: Leg['status']) => {
    setDraftStatuses((prev) => ({ ...prev, [legId]: status }))
  }

  const saveStatuses = async () => {
    for (const leg of surebet.legs || []) {
      const status = draftStatuses[leg.id]
      if (status && status !== leg.status) {
        const { error } = await supabaseClient.from('legs').update({ status }).eq('id', leg.id)
        if (error) {
          alert('Ошибка обновления статуса: ' + error.message)
          return
        }
      }
    }

    const updatedLegs = (surebet.legs || []).map((leg) => ({
      ...leg,
      status: draftStatuses[leg.id] ?? leg.status,
    }))
    const allSettled = updatedLegs.length > 0 && updatedLegs.every((leg) => leg.status !== 'pending')

    if (allSettled) {
      const finalProfit = updatedLegs.reduce((sum, leg) => sum + calculateLegProfit(leg), 0)
      const finalROI = calculateROI(finalProfit, Number(surebet.bank))
      fetch('/api/sheets-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchDate: formatDate(surebet.created_at),
          matchName: surebet.match_name,
          sport: surebet.sport,
          worker: username || surebet.user_id,
          bank: surebet.bank,
          profit: finalProfit,
          roi: finalROI,
          comment: surebet.comment || '',
          legs: updatedLegs.map((leg) => ({
            bookmaker: leg.bookmaker,
            account: leg.account,
            market: leg.market,
            odds: leg.odds,
            stake: leg.stake,
            status: leg.status,
            payout: calculateLegPayout(leg),
            result: calculateLegProfit(leg),
          })),
        }),
      }).catch(() => {
        // Silently ignore sync errors so it never blocks the main workflow.
      })
    }

    setDraftStatuses({})
    onUpdate()
  }

  const deleteSurebet = async () => {
    if (!confirm('Удалить вилку и все плеча?')) return
    const { error } = await supabaseClient.from('surebets').delete().eq('id', surebet.id)
    if (error) {
      alert('Ошибка удаления: ' + error.message)
      return
    }
    onUpdate()
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{surebet.match_name}</h3>
          <p className="text-sm text-gray-400">
            {surebet.sport} · {formatDate(surebet.created_at)}
            {isAdmin && username && ` · ${username}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              displayedProfit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {hasChanges && <span className="mr-1 opacity-70">preview</span>}
            {formatMoney(displayedProfit, currency)} ({displayedROI.toFixed(2)}%)
          </span>
          {isPending && isMultiLeg && (
            <span
              className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/30"
              title="У тройных и более вилок плечи могут быть связаны через исходы матча (форы, DNB, тоталы), поэтому точный расчёт потенциальной прибыли невозможен без учёта этой связи."
            >
              Потенциально: неточно (3+ плеча)
            </span>
          )}
          {isPending && !isMultiLeg && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Потенциально: {isSingleOutcome
                ? `${formatMoney(potentialRange.min, currency)} (${potentialROIMin.toFixed(2)}%)`
                : `от ${formatMoney(potentialRange.min, currency)} до ${formatMoney(potentialRange.max, currency)} (${potentialROIMin.toFixed(2)}% / ${potentialROIMax.toFixed(2)}%)`}
            </span>
          )}
          <button
            onClick={deleteSurebet}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-3 py-1 transition hover:bg-red-500/10"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {surebet.legs?.map((leg) => {
          const selectedStatus = draftStatuses[leg.id] ?? leg.status
          const legProfit = calculateLegProfit({ ...leg, status: selectedStatus } as Leg)
          const color = STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.color || 'cyan'
          const colors = colorClasses[color]
          return (
            <div
              key={leg.id}
              className={`rounded-xl p-4 border ${colors.border} ${colors.bg}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-white">{leg.bookmaker}</p>
                  <p className="text-xs text-gray-400">{leg.market}</p>
                </div>
                <p className="text-sm text-gray-300">{leg.account}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">Коэфф.</p>
                  <p className="text-white whitespace-nowrap">{leg.odds.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Ставка</p>
                  <p className="text-white whitespace-nowrap">{formatMoney(leg.stake, currency)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Результат</p>
                  <p className={`whitespace-nowrap ${legProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(legProfit, currency)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = selectedStatus === option.value
                  return (
                    <button
                      key={`${leg.id}-${option.value}`}
                      onClick={() => setStatus(leg.id, option.value)}
                      className={`flex-1 py-1 text-xs rounded-lg border transition ${
                        isActive ? colorClasses[option.color].active : 'border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={saveStatuses}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition"
          >
            Сохранить результат
          </button>
        </div>
      )}

      {surebet.comment && (
        <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
          <span className="font-medium">Комментарий:</span> {surebet.comment}
        </p>
      )}
    </div>
  )
}

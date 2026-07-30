'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, Leg, SurebetWithLegs } from '@/lib/types'
import { calculateSurebetProfit, calculateROI, calculateLegProfit, calculateLegPayout, calculatePotentialProfitRange, hasPendingLegs, formatMoney, formatDate } from '@/lib/calc'
import { SPORTS, MARKETS } from '@/lib/constants'
import { useCurrency } from './currency-context'
import ComboboxInput from './combobox-input'
import AccountSelect from './account-select'

interface SurebetCardProps {
  surebet: SurebetWithLegs
  isAdmin: boolean
  username?: string
  accounts?: Account[]
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

interface DraftLeg extends Leg {
  isNew?: boolean
}

const inputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm'
const numberInputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function createNewLeg(surebetId: string): DraftLeg {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    surebet_id: surebetId,
    account: '',
    bookmaker: '',
    market: '',
    odds: 0,
    stake: 0,
    status: 'pending',
    created_at: new Date().toISOString(),
    isNew: true,
  }
}

function syncToSheets(surebetId: string, surebetData: object) {
  fetch('/api/sheets-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', surebetId, ...surebetData }),
  }).catch(() => {
    // Silently ignore sync errors so it never blocks the main workflow.
  })
}

export default function SurebetCard({ surebet, isAdmin, username, accounts = [], onUpdate }: SurebetCardProps) {
  const { currency } = useCurrency()
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Leg['status']>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState({ matchName: surebet.match_name, sport: surebet.sport, comment: surebet.comment || '' })
  const [draftLegs, setDraftLegs] = useState<DraftLeg[]>(() => surebet.legs?.map((leg) => ({ ...leg, isNew: false })) || [])
  const [removedLegIds, setRemovedLegIds] = useState<Set<string>>(new Set())
  const [savingEdit, setSavingEdit] = useState(false)

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

  const buildSyncPayload = (legs: Leg[], sportValue?: string, commentValue?: string, settledAtValue?: string) => {
    const endDate = settledAtValue ? formatDate(settledAtValue) : ''
    return {
      rows: legs.map((leg) => ({
        account: leg.account,
        bookmaker: leg.bookmaker,
        eventNumber: '',
        betDate: formatDate(surebet.created_at),
        sport: sportValue || surebet.sport,
        market: leg.market,
        stake: leg.stake,
        odds: leg.odds,
        endDate,
        status: leg.status,
        profit: calculateLegProfit(leg),
        comment: commentValue !== undefined ? commentValue : (surebet.comment || ''),
        betId: surebet.id,
      })),
    }
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
    let settledAt = surebet.settled_at
    if (allSettled && !settledAt) {
      const now = new Date().toISOString()
      const { error } = await supabaseClient.from('surebets').update({ settled_at: now }).eq('id', surebet.id)
      if (!error) {
        settledAt = now
      }
    }

    syncToSheets(surebet.id, buildSyncPayload(updatedLegs, undefined, undefined, settledAt || ''))

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

    fetch('/api/sheets-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', surebetId: surebet.id }),
    }).catch(() => {
      // Silently ignore sync errors so it never blocks the main workflow.
    })
    onUpdate()
  }

  const startEdit = () => {
    setDraft({ matchName: surebet.match_name, sport: surebet.sport, comment: surebet.comment || '' })
    setDraftLegs(surebet.legs?.map((leg) => ({ ...leg, isNew: false })) || [])
    setRemovedLegIds(new Set())
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraft({ matchName: surebet.match_name, sport: surebet.sport, comment: surebet.comment || '' })
    setDraftLegs(surebet.legs?.map((leg) => ({ ...leg, isNew: false })) || [])
    setRemovedLegIds(new Set())
  }

  const updateDraftLeg = (index: number, field: keyof DraftLeg, value: string | number) => {
    setDraftLegs((prev) => {
      const next = [...prev]
      const leg = { ...next[index], [field]: value }
      if (field === 'odds' || field === 'stake') {
        leg[field] = Number(value) || 0
      }
      next[index] = leg
      return next
    })
  }

  const removeDraftLeg = (index: number) => {
    if (draftLegs.length <= 2) return
    const leg = draftLegs[index]
    setDraftLegs((prev) => {
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
    if (!leg.isNew) {
      setRemovedLegIds((prev) => new Set([...prev, leg.id]))
    }
  }

  const addDraftLeg = () => {
    setDraftLegs((prev) => [...prev, createNewLeg(surebet.id)])
  }

  const saveEdit = async () => {
    if (savingEdit) return
    const matchName = draft.matchName.trim()
    const sport = draft.sport.trim()
    if (!matchName || !sport) {
      alert('Заполните название матча и вид спорта')
      return
    }
    const invalidLegs = draftLegs.filter(
      (leg) =>
        !leg.bookmaker.trim() ||
        !leg.account.trim() ||
        !leg.market.trim() ||
        Number(leg.odds) <= 1 ||
        Number(leg.stake) <= 0
    )
    if (invalidLegs.length > 0) {
      alert('Все плечи должны иметь букмекера, аккаунт, рынок, коэффициент > 1 и ставку > 0')
      return
    }

    setSavingEdit(true)
    const totalStake = draftLegs.reduce((sum, leg) => sum + Number(leg.stake), 0)
    const bank = Number(totalStake.toFixed(2))

    const { error: sbError } = await supabaseClient
      .from('surebets')
      .update({ match_name: matchName, sport, comment: draft.comment.trim(), bank })
      .eq('id', surebet.id)
    if (sbError) {
      alert('Ошибка обновления вилки: ' + sbError.message)
      setSavingEdit(false)
      return
    }

    if (removedLegIds.size > 0) {
      const ids = Array.from(removedLegIds)
      const { error: delError } = await supabaseClient.from('legs').delete().in('id', ids)
      if (delError) {
        alert('Ошибка удаления плеча: ' + delError.message)
        setSavingEdit(false)
        return
      }
    }

    for (const leg of draftLegs) {
      const payload = {
        account: leg.account.trim(),
        bookmaker: leg.bookmaker.trim(),
        market: leg.market.trim(),
        odds: Number(leg.odds),
        stake: Number(leg.stake),
      }
      if (leg.isNew) {
        const { error: insertError } = await supabaseClient.from('legs').insert({
          ...payload,
          surebet_id: surebet.id,
          status: leg.status,
        })
        if (insertError) {
          alert('Ошибка добавления плеча: ' + insertError.message)
          setSavingEdit(false)
          return
        }
      } else if (removedLegIds.has(leg.id)) {
        continue
      } else {
        const { error: updateError } = await supabaseClient.from('legs').update(payload).eq('id', leg.id)
        if (updateError) {
          alert('Ошибка обновления плеча: ' + updateError.message)
          setSavingEdit(false)
          return
        }
      }
    }

    const finalLegs = draftLegs.filter((leg) => !removedLegIds.has(leg.id)).map((leg) => ({
      ...leg,
      odds: Number(leg.odds),
      stake: Number(leg.stake),
    })) as Leg[]

    const allSettled = finalLegs.length > 0 && finalLegs.every((leg) => leg.status !== 'pending')
    let settledAt = surebet.settled_at
    if (allSettled && !settledAt) {
      const now = new Date().toISOString()
      const { error } = await supabaseClient.from('surebets').update({ settled_at: now }).eq('id', surebet.id)
      if (!error) {
        settledAt = now
      }
    }

    syncToSheets(surebet.id, buildSyncPayload(finalLegs, sport, draft.comment.trim(), settledAt || ''))

    setSavingEdit(false)
    setIsEditing(false)
    onUpdate()
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={draft.matchName}
                onChange={(e) => setDraft((prev) => ({ ...prev, matchName: e.target.value }))}
                className={inputClass}
                placeholder="Название матча"
              />
              <ComboboxInput
                id={`sport-edit-${surebet.id}`}
                label=""
                value={draft.sport}
                onChange={(val) => setDraft((prev) => ({ ...prev, sport: val }))}
                options={SPORTS}
                placeholder="Вид спорта"
                className={inputClass}
              />
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-white">{surebet.match_name}</h3>
              <p className="text-sm text-gray-400">
                {surebet.sport} · {formatDate(surebet.created_at)}
                {isAdmin && username && ` · ${username}`}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          {!isEditing ? (
            <>
              <button
                onClick={startEdit}
                className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/30 rounded-lg px-3 py-1 transition hover:bg-cyan-500/10"
              >
                Редактировать
              </button>
              <button
                onClick={deleteSurebet}
                className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-3 py-1 transition hover:bg-red-500/10"
              >
                Удалить
              </button>
            </>
          ) : (
            <>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="text-xs text-green-400 hover:text-green-300 border border-green-400/30 rounded-lg px-3 py-1 transition hover:bg-green-500/10 disabled:opacity-50"
              >
                {savingEdit ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="text-xs text-gray-300 hover:text-white border border-white/10 rounded-lg px-3 py-1 transition hover:bg-white/5 disabled:opacity-50"
              >
                Отмена
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {draftLegs.map((leg, idx) => {
          const selectedStatus = draftStatuses[leg.id] ?? leg.status
          const legProfit = calculateLegProfit({ ...leg, status: selectedStatus } as Leg)
          const color = STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.color || 'cyan'
          const colors = colorClasses[color]
          return (
            <div
              key={leg.id}
              className={`rounded-xl p-4 border ${colors.border} ${colors.bg}`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">Плечо {idx + 1}</h4>
                    {draftLegs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeDraftLeg(idx)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <AccountSelect
                    accounts={accounts}
                    bookmaker={leg.bookmaker}
                    account={leg.account}
                    onSelect={(bm, acc) => {
                      updateDraftLeg(idx, 'bookmaker', bm)
                      updateDraftLeg(idx, 'account', acc)
                    }}
                    className={inputClass}
                    required
                  />
                  <ComboboxInput
                    id={`market-edit-${surebet.id}-${idx}`}
                    label=""
                    value={leg.market}
                    onChange={(val) => updateDraftLeg(idx, 'market', val)}
                    options={MARKETS}
                    placeholder="Рынок"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={leg.odds || ''}
                    onChange={(e) => updateDraftLeg(idx, 'odds', e.target.value)}
                    className={numberInputClass}
                    placeholder="Коэффициент"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={leg.stake || ''}
                    onChange={(e) => updateDraftLeg(idx, 'stake', e.target.value)}
                    className={numberInputClass}
                    placeholder={`Ставка (${currency === 'USD' ? '$' : '€'})`}
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Статус: <span className="text-white">{STATUS_OPTIONS.find((s) => s.value === leg.status)?.label}</span>
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          )
        })}
      </div>

      {isEditing && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={addDraftLeg}
            className="px-3 py-1.5 rounded-lg glass text-xs font-medium text-cyan-400 hover:border-cyan-400/40 transition"
          >
            + Добавить плечо
          </button>
        </div>
      )}

      {hasChanges && !isEditing && (
        <div className="flex justify-end">
          <button
            onClick={saveStatuses}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition"
          >
            Сохранить результат
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <label className="block text-xs text-gray-400">Комментарий к вилке</label>
          <input
            value={draft.comment}
            onChange={(e) => setDraft((prev) => ({ ...prev, comment: e.target.value }))}
            className={inputClass}
            placeholder="Если что-то пошло не так..."
          />
        </div>
      ) : (
        surebet.comment && (
          <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
            <span className="font-medium">Комментарий:</span> {surebet.comment}
          </p>
        )
      )}
    </div>
  )
}

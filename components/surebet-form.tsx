'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateExpectedProfitFromStakes, calculateROI, formatMoney } from '@/lib/calc'
import { SPORTS, MARKETS } from '@/lib/constants'
import ComboboxInput from './combobox-input'
import AccountSelect from './account-select'
import { Account } from '@/lib/types'
import { useCurrency } from './currency-context'


interface LegFormState {
  account: string
  bookmaker: string
  market: string
  odds: string
  stake: string
}

interface SurebetFormProps {
  accounts: Account[]
  onCreated: () => void
}

const EMPTY_LEG: LegFormState = { account: '', bookmaker: '', market: '', odds: '', stake: '' }

export default function SurebetForm({ accounts, onCreated }: SurebetFormProps) {
  const { currency } = useCurrency()
  const [matchName, setMatchName] = useState('')
  const [sport, setSport] = useState('')
  const [comment, setComment] = useState('')
  const [legs, setLegs] = useState<LegFormState[]>(() => [
    { ...EMPTY_LEG },
    { ...EMPTY_LEG },
  ])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const parsedOdds = useMemo(
    () => legs.map((leg) => parseFloat(leg.odds) || 0),
    [legs]
  )
  const parsedStakes = useMemo(
    () => legs.map((leg) => parseFloat(leg.stake) || 0),
    [legs]
  )
  const totalStake = useMemo(
    () => parsedStakes.reduce((acc, s) => acc + s, 0),
    [parsedStakes]
  )

  const expectedProfit = useMemo(() => {
    if (totalStake > 0 && parsedOdds.every((o) => o > 1)) {
      return calculateExpectedProfitFromStakes(parsedStakes, parsedOdds)
    }
    return 0
  }, [totalStake, parsedStakes, parsedOdds])

  const updateLeg = useCallback((index: number, field: keyof LegFormState, value: string) => {
    setLegs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }, [])

  const addLeg = useCallback(() => {
    setLegs((prev) => [...prev, { ...EMPTY_LEG }])
  }, [])

  const removeLeg = useCallback((index: number) => {
    setLegs((prev) => {
      if (prev.length <= 2) return prev
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }, [])

  const resetForm = useCallback(() => {
    setMatchName('')
    setSport('')
    setComment('')
    setLegs([{ ...EMPTY_LEG }, { ...EMPTY_LEG }])
  }, [])

  const canSubmit = useMemo(() => {
    return (
      matchName.trim() !== '' &&
      sport.trim() !== '' &&
      totalStake > 0 &&
      legs.every(
        (leg) =>
          leg.account.trim() !== '' &&
          leg.bookmaker.trim() !== '' &&
          leg.market.trim() !== '' &&
          parseFloat(leg.odds) > 1 &&
          parseFloat(leg.stake) > 0
      )
    )
  }, [matchName, sport, totalStake, legs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) {
      alert('Заполните все поля и убедитесь, что коэффициенты больше 1')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Не авторизован')
      setLoading(false)
      return
    }

    const total = totalStake
    const odds = legs.map((leg) => parseFloat(leg.odds))
    const stakes = parsedStakes

    const { data: surebet, error: sbError } = await supabase
      .from('surebets')
      .insert({
        user_id: user.id,
        match_name: matchName.trim(),
        sport: sport.trim(),
        bank: total,
        comment: comment.trim(),
      })
      .select()
      .single()

    if (sbError || !surebet) {
      alert('Ошибка создания вилки: ' + (sbError?.message || ''))
      setLoading(false)
      return
    }

    const { error: legsError } = await supabase.from('legs').insert(
      legs.map((leg, idx) => ({
        surebet_id: surebet.id,
        account: leg.account.trim(),
        bookmaker: leg.bookmaker.trim(),
        market: leg.market.trim(),
        odds: odds[idx],
        stake: stakes[idx],
      }))
    )

    if (legsError) {
      alert('Ошибка добавления плеч: ' + legsError.message)
      setLoading(false)
      return
    }

    resetForm()
    setLoading(false)
    onCreated()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm'

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6 surebet-glow">
      <h2 className="text-xl font-semibold text-cyan-400">Создать вилку</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Название матча</label>
          <input
            value={matchName}
            onChange={(e) => setMatchName(e.target.value)}
            className={inputClass}
            placeholder="Динамо Київ - ФК Хамрун"
            required
          />
        </div>
        <ComboboxInput
          id="sport-list"
          label="Вид спорта"
          value={sport}
          onChange={(val) => setSport(val)}
          options={SPORTS}
          placeholder="Футбол"
          required
          className={inputClass}
        />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Комментарий к вилке</label>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputClass}
            placeholder="Если что-то пошло не так..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Плечи</h3>
          <button
            type="button"
            onClick={addLeg}
            className="px-3 py-1.5 rounded-lg glass text-xs font-medium text-cyan-400 hover:border-cyan-400/40 transition"
          >
            + Добавить плечо
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {legs.map((leg, idx) => (
            <div key={idx} className="space-y-3 glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Плечо {idx + 1}</h4>
                {legs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLeg(idx)}
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
                  updateLeg(idx, 'bookmaker', bm)
                  updateLeg(idx, 'account', acc)
                }}
                className={inputClass}
                required
              />
              {leg.bookmaker && (
                <div className="text-xs text-gray-400">
                  Букмекер: <span className="text-white">{leg.bookmaker}</span>
                </div>
              )}
              <ComboboxInput
                id={`market-list-${idx}`}
                label="Рынок"
                value={leg.market}
                onChange={(val) => updateLeg(idx, 'market', val)}
                options={MARKETS}
                placeholder="Рынок (П1, П2, ТБ...)"
                required
                className={inputClass}
              />
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={leg.odds}
                onChange={(e) => updateLeg(idx, 'odds', e.target.value)}
                className={inputClass}
                placeholder="Коэффициент"
                required
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={leg.stake}
                onChange={(e) => updateLeg(idx, 'stake', e.target.value)}
                className={inputClass}
                placeholder={`Ставка (${currency === 'USD' ? '$' : '€'})`}
                required
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Общий банк:</span>{' '}
          <span className="font-semibold text-white">{formatMoney(totalStake, currency)}</span>
        </div>
        {legs.map((leg, idx) => (
          <div key={idx}>
            <span className="text-gray-400">Ставка плеча {idx + 1}:</span>{' '}
            <span className="font-semibold text-white">{formatMoney(parseFloat(leg.stake) || 0, currency)}</span>
          </div>
        ))}
        <div>
          <span className="text-gray-400">Ожидаемая прибыль:</span>{' '}
          <span
            className={`font-semibold ${expectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatMoney(expectedProfit, currency)} ({calculateROI(expectedProfit, totalStake).toFixed(2)}%)
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full py-3 rounded-lg btn-primary font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Сохраняем...' : 'Создать вилку'}
      </button>
    </form>
  )
}

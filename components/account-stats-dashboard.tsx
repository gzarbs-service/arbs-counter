'use client'

import { useMemo } from 'react'
import { Account, SurebetWithLegs } from '@/lib/types'
import { calculateLegProfit, calculatePotentialProfitRange, formatMoney, calculateROI } from '@/lib/calc'
import { isTestSurebet } from '@/lib/test-account'
import { useCurrency } from './currency-context'

interface AccountStatsDashboardProps {
  accounts: Account[]
  surebets: SurebetWithLegs[]
  embedded?: boolean
}

interface AccountStat {
  account: Account
  legsCount: number
  turnover: number
  profit: number
  roi: number
  won: number
  lost: number
  refund: number
  pending: number
  potentialProfitMin: number
  potentialProfitMax: number
  hasMultiLegPending: boolean
}

export default function AccountStatsDashboard({ accounts, surebets, embedded = false }: AccountStatsDashboardProps) {
  const { currency } = useCurrency()

  const realAccounts = useMemo(() => accounts.filter((a) => !a.is_test), [accounts])

  const stats = useMemo<AccountStat[]>(() => {
    const realSurebets = surebets.filter((s) => !isTestSurebet(s, accounts))
    const allLegs = realSurebets.flatMap((s) => s.legs)

    return realAccounts.map((acc) => {
      const legs = allLegs.filter(
        (l) => l.account === acc.account_number && l.bookmaker === acc.bookmaker
      )

      const turnover = legs.reduce((sum, l) => sum + Number(l.stake), 0)
      const profit = legs.reduce((sum, l) => sum + calculateLegProfit(l), 0)
      const roi = calculateROI(profit, turnover)

      const surebetsWithPendingForAccount = realSurebets.filter((s) =>
        (s.legs || []).some(
          (l) => l.account === acc.account_number && l.bookmaker === acc.bookmaker && l.status === 'pending'
        )
      )
      const simpleSurebetsWithPending = surebetsWithPendingForAccount.filter((s) => (s.legs || []).length <= 2)
      const potentialProfitMin = simpleSurebetsWithPending.reduce(
        (sum, s) => sum + calculatePotentialProfitRange(s).min,
        0
      )
      const potentialProfitMax = simpleSurebetsWithPending.reduce(
        (sum, s) => sum + calculatePotentialProfitRange(s).max,
        0
      )
      const hasMultiLegPending = surebetsWithPendingForAccount.some((s) => (s.legs || []).length > 2)

      return {
        account: acc,
        legsCount: legs.length,
        turnover,
        profit,
        roi,
        won: legs.filter((l) => l.status === 'won').length,
        lost: legs.filter((l) => l.status === 'lost').length,
        refund: legs.filter((l) => l.status === 'refund').length,
        pending: legs.filter((l) => l.status === 'pending').length,
        potentialProfitMin,
        potentialProfitMax,
        hasMultiLegPending,
      }
    })
  }, [realAccounts, surebets, accounts])

  if (realAccounts.length === 0) {
    const emptyMsg = (
      <p className="text-sm text-gray-500">
        Пока нет добавленных аккаунтов. Сначала добавьте аккаунты в разделе «Аккаунты».
      </p>
    )
    if (embedded) return emptyMsg
    return <div className="glass rounded-2xl p-6">{emptyMsg}</div>
  }

  const content = (
    <>
      {!embedded && <h2 className="text-xl font-semibold text-cyan-400">Статистика по аккаунтам</h2>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="py-2">Аккаунт</th>
              <th className="py-2">Вилок</th>
              <th className="py-2">Оборот</th>
              <th className="py-2">Прибыль</th>
              <th className="py-2">ROI</th>
              <th className="py-2">Потенциал</th>
              <th className="py-2">Победы</th>
              <th className="py-2">Проигрыши</th>
              <th className="py-2">Возвраты</th>
              <th className="py-2">В игре</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {stats.map((stat) => (
              <tr key={stat.account.id}>
                <td className="py-3">
                  <span className="text-white">{stat.account.bookmaker}</span>{' '}
                  <span className="text-gray-400">{stat.account.account_number}</span>
                </td>
                <td className="py-3">{stat.legsCount}</td>
                <td className="py-3">{formatMoney(stat.turnover, currency as 'EUR' | 'USD')}</td>
                <td className={`py-3 ${stat.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(stat.profit, currency as 'EUR' | 'USD')}
                </td>
                <td className="py-3">{stat.roi.toFixed(2)}%</td>
                <td className="py-3 text-cyan-300">
                  {stat.pending === 0 ? (
                    '—'
                  ) : (
                    <>
                      {stat.potentialProfitMin === stat.potentialProfitMax
                        ? formatMoney(stat.potentialProfitMin, currency as 'EUR' | 'USD')
                        : `${formatMoney(stat.potentialProfitMin, currency as 'EUR' | 'USD')} / ${formatMoney(stat.potentialProfitMax, currency as 'EUR' | 'USD')}`}
                      {stat.hasMultiLegPending && (
                        <span
                          className="ml-1 text-yellow-300 text-xs"
                          title="Тройные и более вилки не учтены в этой сумме, так как их плечи могут быть связаны через исходы матча и не считаются точно."
                        >
                          (без учёта тройных)
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="py-3 text-green-400">{stat.won}</td>
                <td className="py-3 text-red-400">{stat.lost}</td>
                <td className="py-3 text-gray-400">{stat.refund}</td>
                <td className="py-3 text-blue-400">{stat.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )

  if (embedded) return <div className="space-y-4">{content}</div>

  return <div className="glass rounded-2xl p-6 space-y-4">{content}</div>
}

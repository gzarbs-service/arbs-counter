'use client'

import { Fragment, useMemo, useState } from 'react'
import { Profile, SurebetWithLegs } from '@/lib/types'
import { computeWorkerStats, WorkerStat } from '@/lib/worker-stats'
import { formatMoney } from '@/lib/calc'
import { useCurrency } from './currency-context'

interface WorkerStatsPanelProps {
  profiles: Profile[]
  surebets: SurebetWithLegs[]
}

function BreakdownTable({ title, rows, currency }: { title: string; rows: WorkerStat['bySport']; currency: 'EUR' | 'USD' }) {
  if (rows.length === 0) return null
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-gray-500 border-b border-white/10">
            <tr>
              <th className="py-1 pr-3">Категория</th>
              <th className="py-1 pr-3">Кол-во</th>
              <th className="py-1 pr-3">Оборот</th>
              <th className="py-1 pr-3">Прибыль</th>
              <th className="py-1">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1 pr-3 text-white">{r.label}</td>
                <td className="py-1 pr-3 text-gray-300">{r.count}</td>
                <td className="py-1 pr-3 text-gray-300">{formatMoney(r.turnover, currency)}</td>
                <td className={`py-1 pr-3 ${r.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatMoney(r.profit, currency)}
                </td>
                <td className="py-1 text-gray-300">{r.roi.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function WorkerStatsPanel({ profiles, surebets }: WorkerStatsPanelProps) {
  const { currency } = useCurrency()
  const currencyCode = currency as 'EUR' | 'USD'
  const [expanded, setExpanded] = useState<string | null>(null)

  const stats = useMemo(() => computeWorkerStats(profiles, surebets), [profiles, surebets])

  const sorted = useMemo(() => [...stats].sort((a, b) => b.profit - a.profit), [stats])

  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-gray-500">
        Нет работников для отображения статистики.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="py-2">Работник</th>
              <th className="py-2">Вилок всего</th>
              <th className="py-2">За 7 дн.</th>
              <th className="py-2">За 30 дн.</th>
              <th className="py-2">В игре</th>
              <th className="py-2">Оборот</th>
              <th className="py-2">Прибыль</th>
              <th className="py-2">ROI</th>
              <th className="py-2">Средний ROI</th>
              <th className="py-2">Ошибки</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((stat) => (
              <Fragment key={stat.profile.id}>
                <tr>
                  <td className="py-3 text-white font-medium">{stat.profile.username}</td>
                  <td className="py-3">{stat.totalCount}</td>
                  <td className="py-3">{stat.count7d}</td>
                  <td className="py-3">{stat.count30d}</td>
                  <td className="py-3 text-blue-400">{stat.pendingCount}</td>
                  <td className="py-3">{formatMoney(stat.turnover, currencyCode)}</td>
                  <td className={`py-3 ${stat.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(stat.profit, currencyCode)}
                  </td>
                  <td className="py-3">{stat.roi.toFixed(2)}%</td>
                  <td className="py-3">{stat.avgRoi.toFixed(2)}%</td>
                  <td className="py-3">
                    {stat.errorCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                        {stat.errorCount}
                      </span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setExpanded(expanded === stat.profile.id ? null : stat.profile.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {expanded === stat.profile.id ? 'Скрыть' : 'Подробнее'}
                    </button>
                  </td>
                </tr>
                {expanded === stat.profile.id && (
                  <tr>
                    <td colSpan={11} className="py-4 bg-white/[0.02]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                        <BreakdownTable title="По видам спорта" rows={stat.bySport} currency={currencyCode} />
                        <BreakdownTable title="По букмекерам" rows={stat.byBookmaker} currency={currencyCode} />
                      </div>
                      {stat.errorCount > 0 && (
                        <p className="text-xs text-yellow-400 mt-3 px-2">
                          Вилки с признаками ошибки: {stat.errorSurebetIds.length} шт. (некорректные коэффициенты,
                          результат хуже расчётного минимума, либо оставлен комментарий).
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

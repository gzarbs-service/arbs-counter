'use client'

import { Fragment, useMemo, useState } from 'react'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { computeWorkerStats, WorkerStat } from '@/lib/worker-stats'
import { formatMoney, formatDate } from '@/lib/calc'
import { useCurrency } from './currency-context'
import SurebetCard from './surebet-card'

interface WorkerStatsPanelProps {
  profiles: Profile[]
  surebets: SurebetWithLegs[]
  accounts?: Account[]
  onUpdate?: () => void
}

function ErrorsTable({
  errors,
  currency,
  ownerUsername,
  accounts,
  onUpdate,
}: {
  errors: WorkerStat['errors']
  currency: 'EUR' | 'USD'
  ownerUsername: string
  accounts?: Account[]
  onUpdate?: () => void
}) {
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null)

  if (errors.length === 0) return null
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">Вилки с признаками ошибки</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-gray-500 border-b border-white/10">
            <tr>
              <th className="py-1 pr-3">Матч</th>
              <th className="py-1 pr-3">Спорт</th>
              <th className="py-1 pr-3">Дата</th>
              <th className="py-1 pr-3">Прибыль</th>
              <th className="py-1">Причина</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {errors.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <button
                      onClick={() => setExpandedErrorId(expandedErrorId === e.id ? null : e.id)}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline transition text-left"
                    >
                      {e.matchName}
                    </button>
                  </td>
                  <td className="py-1.5 pr-3 text-gray-300 whitespace-nowrap">{e.sport}</td>
                  <td className="py-1.5 pr-3 text-gray-400 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td className={`py-1.5 pr-3 whitespace-nowrap ${e.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(e.profit, currency)}
                  </td>
                  <td className="py-1.5 text-yellow-400">
                    <ul className="list-disc list-inside space-y-0.5">
                      {e.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
                {expandedErrorId === e.id && (
                  <tr>
                    <td colSpan={5} className="py-3 bg-white/[0.02]">
                      <SurebetCard
                        surebet={e.surebet}
                        isAdmin
                        username={ownerUsername}
                        accounts={accounts}
                        onUpdate={onUpdate ?? (() => {})}
                      />
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

export default function WorkerStatsPanel({ profiles, surebets, accounts, onUpdate }: WorkerStatsPanelProps) {
  const { currency } = useCurrency()
  const currencyCode = currency as 'EUR' | 'USD'
  const [expanded, setExpanded] = useState<string | null>(null)

  const stats = useMemo(() => computeWorkerStats(profiles, surebets, accounts), [profiles, surebets, accounts])

  const sorted = useMemo(() => [...stats].sort((a, b) => b.profit - a.profit), [stats])

  if (stats.length === 0) {
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
                      {stat.errors.length > 0 && (
                        <div className="mt-4 px-2">
                          <ErrorsTable
                            errors={stat.errors}
                            currency={currencyCode}
                            ownerUsername={stat.profile.username}
                            accounts={accounts}
                            onUpdate={onUpdate}
                          />
                        </div>
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

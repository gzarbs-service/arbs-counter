'use client'

import { SurebetWithLegs } from '@/lib/types'
import { calculateSurebetProfit, calculateROI, formatMoney } from '@/lib/calc'
import { useCurrency } from './currency-context'

export default function StatsPanel({ surebets }: { surebets: SurebetWithLegs[] }) {
  const { currency } = useCurrency()

  const totalSurebets = surebets.length
  const turnover = surebets.reduce((sum, s) => sum + Number(s.bank), 0)
  const netProfit = surebets.reduce((sum, s) => sum + calculateSurebetProfit(s), 0)
  const roi = calculateROI(netProfit, turnover)
  const avgRoi = totalSurebets > 0
    ? surebets.reduce((sum, s) => sum + calculateROI(calculateSurebetProfit(s), Number(s.bank)), 0) / totalSurebets
    : 0

  const cards = [
    { label: 'Всего вилок', value: totalSurebets.toString() },
    { label: 'Оборот', value: formatMoney(turnover, currency) },
    { label: 'Прибыль', value: formatMoney(netProfit, currency), positive: netProfit >= 0 },
    { label: 'ROI', value: `${roi.toFixed(2)}%` },
    { label: 'Средний ROI', value: `${avgRoi.toFixed(2)}%` },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="glass rounded-2xl p-5">
          <div className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              card.positive === undefined
                ? 'text-white'
                : card.positive
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}

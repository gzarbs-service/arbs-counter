'use client'

import { SurebetWithLegs } from '@/lib/types'
import { calculateSurebetProfit, calculateROI, formatMoney, formatDate } from '@/lib/calc'
import { useCurrency } from './currency-context'

interface CsvExportProps {
  surebets: SurebetWithLegs[]
  usernames?: Record<string, string>
  filename?: string
}

function csvCell(value: string | number): string {
  const str = String(value).replace(/"/g, '""')
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`
  }
  return str
}

export default function CsvExport({ surebets, usernames, filename = 'surebets' }: CsvExportProps) {
  const { currency } = useCurrency()

  const download = () => {
    const headers = [
      'ID',
      'Дата',
      'Матч',
      'Вид спорта',
      'Работник',
      'Статус',
      'Банк',
      'Прибыль',
      'ROI',
      'Плечи',
    ]

    const rows = surebets.map((s) => {
      const profit = calculateSurebetProfit(s)
      const roi = calculateROI(profit, Number(s.bank))
      const legsStr = s.legs
        .map(
          (l) =>
            `${l.bookmaker} ${l.market} @${l.odds} ${formatMoney(l.stake, currency)} [${l.status}]`
        )
        .join('; ')

      return [
        s.id,
        formatDate(s.created_at),
        s.match_name,
        s.sport,
        usernames?.[s.user_id] || s.user_id,
        s.status,
        formatMoney(Number(s.bank), currency),
        formatMoney(profit, currency),
        `${roi.toFixed(2)}%`,
        legsStr,
      ].map(csvCell)
    })

    const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="px-4 py-2 rounded-lg glass hover:border-green-400/40 transition text-sm font-medium"
    >
      Скачать CSV
    </button>
  )
}

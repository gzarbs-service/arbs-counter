'use client'

import { Leg, SurebetWithLegs } from '@/lib/types'
import { calculateSurebetProfit, calculateROI, formatMoney, formatDate, type MoneyCurrency } from '@/lib/calc'
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

function legResult(leg: Leg, currencyCode: MoneyCurrency) {
  if (leg.status === 'won') {
    const payout = Number(leg.stake) * Number(leg.odds)
    const net = payout - Number(leg.stake)
    return {
      payoutText: formatMoney(payout, currencyCode),
      netText: formatMoney(net, currencyCode),
    }
  }
  if (leg.status === 'refund') {
    return { payoutText: formatMoney(Number(leg.stake), currencyCode), netText: formatMoney(0, currencyCode) }
  }
  if (leg.status === 'lost') {
    return { payoutText: formatMoney(0, currencyCode), netText: formatMoney(-Number(leg.stake), currencyCode) }
  }
  return { payoutText: formatMoney(0, currencyCode), netText: formatMoney(0, currencyCode) }
}

export default function CsvExport({ surebets, usernames, filename = 'surebets' }: CsvExportProps) {
  const { currency } = useCurrency()
  const currencyCode = currency as MoneyCurrency

  const download = () => {
    const headers = [
      'ID вилки',
      'Дата',
      'Матч',
      'Вид спорта',
      'Работник',
      'Статус вилки',
      'Общий банк',
      'Прибыль вилки',
      'ROI',
      '№ плеча',
      'Букмекер',
      'Аккаунт',
      'Рынок',
      'Коэффициент',
      'Ставка',
      'Статус плеча',
      'Выплата',
      'Результат плеча',
    ]

    const rows: string[][] = []

    surebets.forEach((s) => {
      const profit = calculateSurebetProfit(s)
      const roi = calculateROI(profit, Number(s.bank))
      const worker = usernames?.[s.user_id] || s.user_id
      const base = [
        s.id,
        formatDate(s.created_at),
        s.match_name,
        s.sport,
        worker,
        s.status,
        formatMoney(Number(s.bank), currencyCode),
        formatMoney(profit, currencyCode),
        `${roi.toFixed(2)}%`,
      ]

      if (s.legs.length === 0) {
        rows.push([...base, '', '', '', '', '', '', '', ''])
        return
      }

      s.legs.forEach((leg, idx) => {
        const { payoutText, netText } = legResult(leg, currencyCode)
        rows.push([
          ...base,
          String(idx + 1),
          leg.bookmaker,
          leg.account,
          leg.market,
          String(leg.odds),
          formatMoney(Number(leg.stake), currencyCode),
          leg.status,
          payoutText,
          netText,
        ])
      })
    })

    const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join(
      '\n'
    )
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

'use client'

import { useCurrency, type Currency } from './currency-context'

const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'EUR', label: '€ EUR' },
  { value: 'USD', label: '$ USD' },
]

export default function CurrencySelect() {
  const { currency, setCurrency } = useCurrency()

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as Currency)}
      className="px-3 py-2 rounded-lg glass text-sm font-medium bg-transparent cursor-pointer hover:border-cyan-400/40 transition"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#0a0a0f]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

'use client'

import { Account } from '@/lib/types'

interface AccountSelectProps {
  accounts: Account[]
  bookmaker: string
  account: string
  onSelect: (bookmaker: string, account: string) => void
  className: string
  required?: boolean
}

export default function AccountSelect({
  accounts,
  bookmaker,
  account,
  onSelect,
  className,
  required,
}: AccountSelectProps) {
  const value = bookmaker && account ? `${bookmaker}|${account}` : ''

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value
    if (!raw) {
      onSelect('', '')
      return
    }
    const [bm, ...accParts] = raw.split('|')
    onSelect(bm, accParts.join('|'))
  }

  return (
    <select value={value} onChange={handleChange} className={className} required={required}>
      <option value="">Выберите аккаунт</option>
      {accounts.map((acc) => (
        <option key={acc.id} value={`${acc.bookmaker}|${acc.account_number}`}>
          {acc.bookmaker} {acc.account_number}
        </option>
      ))}
    </select>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account } from '@/lib/types'
import ComboboxInput from './combobox-input'

const BOOKMAKERS = ['Fezbet', 'N1bet', 'Stonevegas', 'Pinnacle', 'Bookmaker.xyz']

interface AccountsPanelProps {
  initialAccounts: Account[]
  onChange: (accounts: Account[]) => void
}

export default function AccountsPanel({ initialAccounts, onChange }: AccountsPanelProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [bookmaker, setBookmaker] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const refreshAccounts = useCallback(async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      const updated = data as Account[]
      setAccounts(updated)
      onChange(updated)
    }
  }, [onChange, supabase])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookmaker.trim() || !accountNumber.trim()) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      bookmaker: bookmaker.trim(),
      account_number: accountNumber.trim(),
      is_active: true,
    })

    if (error) {
      alert('Ошибка добавления аккаунта: ' + error.message)
      setLoading(false)
      return
    }

    setBookmaker('')
    setAccountNumber('')
    await refreshAccounts()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить аккаунт?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) {
      alert('Ошибка удаления: ' + error.message)
      return
    }
    await refreshAccounts()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm'

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <h2 className="text-xl font-semibold text-cyan-400">Аккаунты в игре</h2>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <ComboboxInput
          id="account-bookmaker-list"
          label="Букмекер"
          value={bookmaker}
          onChange={setBookmaker}
          options={BOOKMAKERS}
          placeholder="БК"
          required
          className={inputClass}
        />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Номер аккаунта</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={inputClass}
            placeholder="12345"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg btn-primary font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Добавляем...' : '+ Добавить аккаунт'}
        </button>
      </form>

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-gray-500 text-sm">Пока нет аккаунтов.</p>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between glass rounded-xl p-3 text-sm"
            >
              <span className="text-white">
                {acc.bookmaker} <span className="text-gray-400">{acc.account_number}</span>
              </span>
              <button
                type="button"
                onClick={() => handleDelete(acc.id)}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
